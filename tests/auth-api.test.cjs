/* eslint-disable @typescript-eslint/no-require-imports -- Node's standalone test runner loads compiled TypeScript. */
process.env.MOCK_API_GET_CACHE_TTL_MS = "0";
const assert = require("node:assert/strict");
const { mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { test } = require("node:test");
const { NextRequest } = require("next/server");
const { loadSource } = require("./support/load-source.cjs");
const { origin, password, setupMockData } = require("./support/mock-data.cjs");

process.env.AUTH_SESSION_SECRET = "session-secret-only-for-offline-tests";
process.env.MOCK_API_BASE_URL = origin;
process.env.NODE_ENV = "production";

const load = loadSource();
const { AUTH_SESSION_COOKIE, parseAuthSessionCookie } = load("src/core/auth/cookie.ts");
const { POST: login } = load("src/app/api/auth/login/route.ts");
const { POST: logout } = load("src/app/api/auth/logout/route.ts");
const { GET: getSession } = load("src/app/api/auth/session/route.ts");
const { POST: startInspectEvent, DELETE: stopInspectEvent } = load("src/app/api/auth/inspect-event/route.ts");
const { GET: getAdminUsers } = load("src/app/api/admin/users/route.ts");
const { GET: getAdminUser } = load("src/app/api/admin/users/[id]/route.ts");
const { GET: getAdminEvents } = load("src/app/api/admin/events/route.ts");
const { GET: getAdminEvent } = load("src/app/api/admin/events/[id]/route.ts");
const { GET: getAssignableUsers } = load("src/app/api/admin/events/assignable-users/route.ts");
const { GET: getWorkspace } = load("src/app/api/event/workspace/route.ts");
const { GET: getForms } = load("src/app/api/event/forms/route.ts");
const portal = "https://portal.example.test";

function request(path, { cookie, method = "GET", body, origin = portal } = {}) {
  const headers = new Headers();
  if (cookie) headers.set("cookie", `${AUTH_SESSION_COOKIE}=${cookie}`);
  if (method !== "GET") headers.set("origin", origin);
  if (body !== undefined) headers.set("content-type", "application/json");
  return new NextRequest(`${portal}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function context(name, value) {
  return { params: Promise.resolve({ [name]: value }) };
}

function cookieValue(response) {
  const cookie = response.cookies.get(AUTH_SESSION_COOKIE);
  assert.ok(cookie, "response must set the portal session cookie");
  return cookie.value;
}

function assertNoStore(response) {
  assert.match(response.headers.get("cache-control") ?? "", /\bno-store\b/i);
}

async function signIn(account) {
  const response = await login(request("/api/auth/login", {
    method: "POST",
    body: { email: account.email, password },
  }));
  assert.equal(response.status, 200);
  return { cookie: cookieValue(response), response };
}

function createEventHandler(sendSetupPasswordInvite = async () => {}) {
  const loadCreate = loadSource({
    "@/core/mail/send-invite": { sendSetupPasswordInvite },
  });
  return loadCreate("src/app/api/admin/events/route.ts").POST;
}

function createEventRequest(cookie, body) {
  return request("/api/admin/events?locale=en", { method: "POST", cookie, body });
}

const newEventInput = {
  mode: "new",
  slug: "qa-new-owner",
  titleEn: "New owner",
  titleTh: "ผู้จัดใหม่",
  adminName: "QA Event Owner",
  adminEmail: "qa-owner@example.test",
};

async function assertDenied(response, status, path) {
  assert.equal(response.status, status, path);
  const body = await response.json();
  assert.equal(typeof body.error, "string");
  assert.equal("user" in body || "users" in body || "eventId" in body, false);
}

function assertNoPersonalDetails(body, accounts) {
  const serialized = JSON.stringify(body);
  for (const account of accounts) {
    for (const value of [account.display_name, account.email, account.phone, account.password]) {
      if (value) assert.equal(serialized.includes(value), false, `exposed fixture field of ${account.id}`);
    }
  }
}

test("login issues an expiring HttpOnly cookie and logout clears the browser session", async (t) => {
  const { owner } = setupMockData(t);
  const { cookie, response } = await signIn(owner);
  const setCookie = response.headers.get("set-cookie");
  assert.match(setCookie, /\bHttpOnly\b/i);
  assert.match(setCookie, /\bSecure\b/i);
  assert.match(setCookie, /\bSameSite=Lax\b/i);
  assert.match(setCookie, /\bPath=\//i);
  assertNoStore(response);
  const { user } = await response.json();
  assert.equal(user.id, owner.id);
  assert.equal(user.email, owner.email);
  assert.equal("password" in user, false);

  const claims = parseAuthSessionCookie(cookie);
  assert.equal(claims.userId, owner.id);
  assert.equal(parseAuthSessionCookie(cookie, claims.expiresAt), null);

  const sessionResponse = await getSession(request("/api/auth/session", { cookie }));
  assert.equal(sessionResponse.status, 200);
  assertNoStore(sessionResponse);
  const snapshot = await sessionResponse.json();
  assert.equal(snapshot.realUser.id, owner.id);
  assert.equal(snapshot.impersonatedUser, null);

  const logoutResponse = await logout(request("/api/auth/logout", { cookie, method: "POST" }));
  assert.equal(logoutResponse.status, 200);
  assert.equal(cookieValue(logoutResponse), "");
  assert.match(logoutResponse.headers.get("set-cookie"), /\bMax-Age=0\b/i);
  assertNoStore(logoutResponse);
  await assertDenied(await getSession(request("/api/auth/session")), 401);
});

test("login denies a different origin before querying the account store", async (t) => {
  const { owner, calls } = setupMockData(t);
  await assertDenied(await login(request("/api/auth/login", {
    method: "POST",
    origin: "https://other.example.test",
    body: { email: owner.email, password },
  })), 403);
  assert.deepEqual(calls, []);
});

test("protected BFF routes deny absent, invalid and insufficient portal sessions", async (t) => {
  const { admin, owner, assistant, calls } = setupMockData(t);
  for (const [path, methods, route] of [
    ["/api/admin/overview", ["GET"]],
    ["/api/admin/users", ["GET"]],
    ["/api/admin/users/EventOwner", ["GET"], "/api/admin/users/[id]"],
    ["/api/admin/events", ["GET", "POST"]],
    ["/api/admin/events/event-a", ["GET", "PATCH"], "/api/admin/events/[id]"],
    ["/api/admin/events/event-a/status", ["PATCH"], "/api/admin/events/[id]/status"],
    ["/api/admin/events/assignable-users", ["GET"]],
    ["/api/admin/events/cron", ["POST"]],
    ["/api/event/workspace", ["GET"]],
    ["/api/event/setup/publish", ["POST"]],
    ["/api/event/setup/whitelist", ["GET", "PATCH"]],
    ["/api/event/forms?eventId=event-a", ["GET", "POST"], "/api/event/forms"],
    ["/api/event/forms/form-a", ["GET", "PUT", "DELETE"], "/api/event/forms/[id]"],
    ["/api/event/forms/form-a/status", ["PATCH"], "/api/event/forms/[id]/status"],
  ]) {
    const handlers = load(`src/app${route ?? path}/route.ts`);
    for (const method of methods) {
      await assertDenied(await handlers[method](request(path, { method })), 401, path);
      await assertDenied(await handlers[method](request(path, { method, cookie: "invalid" })), 401, path);
    }
  }
  assert.deepEqual(calls, [], "invalid sessions are rejected before upstream reads");

  const { cookie: adm } = await signIn(admin);
  const { cookie: own } = await signIn(owner);
  const { cookie: team } = await signIn(assistant);
  await assertDenied(await getAdminUsers(request("/api/admin/users", { cookie: own })), 403);
  await assertDenied(await getWorkspace(request("/api/event/workspace", { cookie: adm })), 403);
  // view_only staff may list their event forms, but not another event's
  assert.equal(
    (await getForms(request("/api/event/forms?eventId=event-a", { cookie: team }))).status,
    200,
  );
  await assertDenied(await getForms(request("/api/event/forms?eventId=event-b", { cookie: own })), 403);
});

test("Event form lists load only the definitions permitted by the caller's form access", async (t) => {
  const { owner, collections, calls } = setupMockData(t);
  const access = collections.event_access.find((row) => row.user_id === owner.id);
  access.can_manage_sub_users = false;
  access.matrix.registrationForm = "restricted";
  access.matrix.surveyForm = "restricted";
  const stamp = "2026-01-01T12:00:00.000Z";
  for (const type of ["registration", "survey"]) {
    collections.forms.push({
      id: type + "-id", event_id: "event-a", type, status: "draft",
      opens_at: null, closes_at: null, created_at: stamp, updated_at: stamp, deleted_at: null,
    });
  }
  collections.form_translations = [];
  collections.form_fields = [];
  const { cookie } = await signIn(owner);
  const list = "/api/event/forms?eventId=event-a";
  // Cached clients may still send the retired query flag.
  const previousQuery = list + "&publishReview=1";
  for (const url of [list, previousQuery]) {
    await assertDenied(await getForms(request(url, { cookie })), 403);
  }
  assert.ok(!calls.some(({ url }) => url.pathname === "/forms"));

  access.matrix.surveyForm = "view_only";
  for (const url of [list, previousQuery]) {
    const response = await getForms(request(url, { cookie }));
    assert.equal(response.status, 200);
    assertNoStore(response);
    const data = await response.json();
    assert.deepEqual(data.forms.map((form) => form.id), ["survey-id"]);
    assert.equal(data.surveyFormAccess, "view_only");
    assert.equal(data.registrationFormAccess, "restricted");
    assert.equal(data.restrictedForms, undefined);
  }
  assert.ok(calls.some(({ url }) => url.searchParams.get("form_id") === "survey-id"));
  assert.ok(!calls.some(({ url }) => url.searchParams.get("form_id") === "registration-id"));
  access.deleted_at = stamp;
  await assertDenied(await getForms(request(list, { cookie })), 403);
});

test("editable legacy registration and survey drafts accept their first schedule and open at the chosen time", async (t) => {
  const { owner, assistant, collections } = setupMockData(t, { eventWrites: true });
  const event = collections.events[0];
  Object.assign(event, { status: "open", has_registration: true, has_survey: true });
  const cacheDir = mkdtempSync(join(tmpdir(), "legacy-form-status-"));
  t.after(() => rmSync(cacheDir, { recursive: true, force: true }));
  const local = loadSource({ "node:os": { tmpdir: () => cacheDir } });
  const { PATCH } = local("src/app/api/event/forms/[id]/status/route.ts");
  const { GET } = local("src/app/api/event/forms/route.ts");
  const { runFormsCron } = local("src/services/event/forms.ts");
  const { cookie } = await signIn(owner);
  const { cookie: viewOnlyCookie } = await signIn(assistant);
  const listPath = "/api/event/forms?eventId=" + event.id;
  const schedule = {
    status: "scheduled",
    opensAt: new Date(Date.now() + 3_600_000).toISOString(),
    closesAt: new Date(Date.now() + 7_200_000).toISOString(),
  };
  const endAt = new Date(Date.now() + 10_800_000).toISOString();
  const surveyClose = new Date(Date.parse(endAt) + 3_600_000).toISOString();
  Object.assign(event, { start_at: event.updated_at, end_at: endAt });
  const patch = (id, session, body) => PATCH(
    request(`/api/event/forms/${id}/status`, { method: "PATCH", cookie: session, body }),
    context("id", id),
  );
  collections.form_fields = [];
  collections.form_translations = [];
  collections.field_translations = [];
  for (const type of ["registration", "survey"]) {
    const id = "legacy-" + type;
    collections.forms.push({
      id, event_id: event.id, type, status: "draft", opens_at: null, closes_at: null,
      created_at: event.updated_at, updated_at: event.updated_at, deleted_at: null,
    });
    collections.form_fields.push({ id: id + "-q", form_id: id, type: "short_text", display_order: 1 });
    collections.form_translations.push({ form_id: id, locale_code: "en", title: type });
    collections.field_translations.push({ field_id: id + "-q", locale_code: "en", label: "Answer" });
  }
  const response = await GET(request(listPath, { cookie }));
  assert.equal(response.status, 200);
  const list = await response.json();
  assert.equal(list.forms.length, 2);
  assert.deepEqual(list.legacyScheduleWindow, { startsAt: event.start_at, endsAt: event.end_at });
  for (const status of ["scheduled", "closed", "draft"]) {
    event.status = status;
    const data = await (await GET(request(listPath, { cookie }))).json();
    assert.deepEqual(data.legacyScheduleWindow, status === "scheduled" ? list.legacyScheduleWindow : null);
  }
  event.status = "open";
  for (const form of list.forms) {
    assert.equal(form.status, "draft");
    assert.equal(form.canChangeStatus, true);
    assert.equal(form.opensAt, null);
    assert.equal(form.closesAt, null);
    assert.equal(list[form.type + "FormAccess"], "can_edit");
    await assertDenied(await patch(form.id, viewOnlyCookie, schedule), 403, form.id);
    if (form.type === "registration") {
      const invalid = await patch(form.id, cookie, { status: "scheduled", opensAt: endAt, closesAt: null });
      assert.equal(invalid.status, 400);
      assert.equal((await invalid.json()).error, "REGISTRATION_OUTSIDE_EVENT");
    }
    const bounds = form.type === "survey" ? { ...schedule, closesAt: surveyClose } : schedule;
    const saved = await patch(form.id, cookie, bounds);
    assert.equal(saved.status, 200);
    const record = await saved.json();
    assert.equal(record.status, "scheduled");
    assert.equal(record.opensAt, bounds.opensAt);
    assert.equal(record.closesAt, bounds.closesAt);
  }
  const registrationId = "legacy-registration";
  const invalidReschedule = await patch(registrationId, cookie, { status: "scheduled", closesAt: surveyClose });
  assert.equal(invalidReschedule.status, 400);
  assert.equal((await invalidReschedule.json()).error, "REGISTRATION_OUTSIDE_EVENT");
  const cleared = await patch(registrationId, cookie, { status: "scheduled", closesAt: null });
  assert.equal(cleared.status, 200);
  assert.equal((await cleared.json()).closesAt, null);
  event.end_at = new Date(Date.now() - 60_000).toISOString();
  assert.equal((await patch(registrationId, cookie, { status: "scheduled" })).status, 200);
  assert.equal((await patch(registrationId, cookie, { status: "draft" })).status, 200);
  event.end_at = endAt;
  assert.equal((await patch(registrationId, cookie, { status: "scheduled" })).status, 200);
  assert.deepEqual((await runFormsCron(Date.parse(schedule.opensAt) - 1)).opened, []);
  const ids = list.forms.map((form) => form.id).sort();
  assert.deepEqual((await runFormsCron(Date.parse(schedule.opensAt))).opened.sort(), ids);
  assert.deepEqual((await runFormsCron(Date.parse(endAt) - 1)).closed, []);
  assert.equal(event.status, "open");
  assert.deepEqual((await runFormsCron(Date.parse(endAt))).closed, [registrationId]);
  assert.deepEqual((await runFormsCron(Date.parse(surveyClose))).closed, ["legacy-survey"]);
  const closed = await (await GET(request(listPath, { cookie }))).json();
  assert.ok(closed.forms.every((form) => form.status === "closed" && !form.canChangeStatus));
});

test("Setup Whitelist rejects other-event IDs and requires Registration permission", async (t) => {
  const { owner, assistant, calls } = setupMockData(t);
  const { GET, PATCH } = load("src/app/api/event/setup/whitelist/route.ts");
  const { cookie } = await signIn(owner);
  const { cookie: team } = await signIn(assistant);
  const endpoint = "/api/event/setup/whitelist";
  await assertDenied(await GET(request(endpoint + "?eventId=event-b", { cookie })), 409);
  await assertDenied(await PATCH(request(endpoint, {
    method: "PATCH", cookie,
    body: { eventId: "event-b", revision: 0, entries: [] },
  })), 409);
  await assertDenied(await GET(request(endpoint + "?eventId=event-a", { cookie: team })), 403);
  assert.ok(!calls.some(({ method, url }) => method === "PATCH" || url.pathname === "/events/event-b"));
});

test("Workspace and Setup expose only matching form references from an immutable publication", async (t) => {
  const { owner, assistant, collections } = setupMockData(t);
  const access = collections.event_access.find((row) => row.user_id === assistant.id);
  access.matrix.registrationForm = "restricted";
  const event = collections.events[0];
  const draft = {
    eventName: "Guest event", locationName: "Hall", description: null,
    startsAt: null, endsAt: null, isPrivate: true, hasRegistration: true, hasSurvey: true, surveyAccess: "public",
  };
  const publishedAt = "2026-01-01T06:00:00.000Z";
  const forms = {};
  for (const type of ["registration", "survey"]) {
    forms[type] = {
      id: type + "-id", type, eventId: event.id, status: "open", opensAt: null, closesAt: null,
      createdAt: publishedAt, updatedAt: publishedAt, questions: [],
      head: { en: { title: "Saved " + type + " questions", description: "" } },
    };
    collections.forms.push({
      id: forms[type].id, event_id: event.id, type, status: "open", opens_at: null, closes_at: null,
      created_at: publishedAt, updated_at: publishedAt, deleted_at: null,
    });
  }
  const { encodeSetupRecord } = load("src/core/event/setup-storage.ts");
  const { defaultEventBranding } = load("src/core/event/branding.ts");
  event.setup = encodeSetupRecord(event.id, {
    revision: 1, draft, branding: {}, pendingMedia: {}, whitelist: null,
    publication: { publishedAt, draft, branding: defaultEventBranding, forms },
  });
  const { GET: getDraft } = load("src/app/api/event/setup/draft/route.ts");
  for (const [account, seesRegistration] of [[owner, true], [assistant, false]]) {
    const { cookie } = await signIn(account);
    const workspace = await (await getWorkspace(request("/api/event/workspace", { cookie }))).json();
    const setup = await (await getDraft(request("/api/event/setup/draft?eventId=event-a", { cookie }))).json();
    for (const payload of [workspace.setup, setup]) {
      assert.equal(payload.publication.publishedAt, publishedAt);
      assert.deepEqual(payload.publication.forms, {
        registration: seesRegistration ? { id: "registration-id", closesAt: null } : null,
        survey: { id: "survey-id", closesAt: null },
      });
      assert.doesNotMatch(JSON.stringify(payload), /Saved (registration|survey) questions/);
    }
    const permitted = await (await getForms(request("/api/event/forms?eventId=event-a", { cookie }))).json();
    assert.equal(permitted.legacyScheduleWindow, null);
    assert.deepEqual(permitted.forms.map((form) => form.head.en.title),
      seesRegistration ? ["Saved registration questions", "Saved survey questions"] : ["Saved survey questions"]);
  }
  // A legacy draft that was omitted from the publication still belongs to a snapshot-managed event.
  event.setup = encodeSetupRecord(event.id, {
    revision: 2, draft, branding: {}, pendingMedia: {}, whitelist: null,
    publication: { publishedAt, draft, branding: defaultEventBranding, forms: { ...forms, registration: null } },
  });
  collections.forms.find((form) => form.type === "registration").status = "draft";
  collections.form_fields = [];
  collections.form_translations = [];
  const { cookie } = await signIn(owner);
  const omitted = await (await getForms(request("/api/event/forms?eventId=event-a", { cookie }))).json();
  assert.equal(omitted.legacyScheduleWindow, null);
  const hiddenFromPublication = omitted.forms.find((form) => form.id === "registration-id");
  assert.equal(hiddenFromPublication.canChangeStatus, false);
  const { PATCH } = load("src/app/api/event/forms/[id]/status/route.ts");
  const denied = await PATCH(request("/api/event/forms/registration-id/status", {
    method: "PATCH", cookie,
    body: { status: "scheduled", opensAt: new Date(Date.now() + 3_600_000).toISOString() },
  }), context("id", "registration-id"));
  assert.equal(denied.status, 409);
  assert.equal((await denied.json()).error, "FORM_STATUS_LOCKED");
});

test("workspace follows the authenticated account and suspended accounts lose access", async (t) => {
  const { owner, otherOwner } = setupMockData(t);
  const { cookie } = await signIn(owner);
  const response = await getWorkspace(request(
    `/api/event/workspace?locale=en&userId=${otherOwner.id}`,
    { cookie },
  ));
  assert.equal(response.status, 200);
  const workspace = await response.json();
  assert.equal(workspace.eventId, owner.event_id);
  assertNoPersonalDetails(workspace, [owner, otherOwner]);

  owner.status = "suspended";
  await assertDenied(await getWorkspace(request("/api/event/workspace", { cookie })), 401);
});

test("event inspection uses canInspection, keeps admin role, and restores the original expiry", async (t) => {
  const { admin, reviewer, owner, platformPermissions, collections } = setupMockData(t);
  collections.event_translations.push({
    id: "tr-a",
    event_id: "event-a",
    locale_code: "en",
    title: "Fixture Event A",
  });
  const { cookie: adminCookie } = await signIn(admin);
  const { cookie: reviewerCookie } = await signIn(reviewer);
  const { cookie: ownerCookie } = await signIn(owner);
  const inspectPath = "/api/auth/inspect-event";
  for (const cookie of [reviewerCookie, ownerCookie]) {
    const denied = await startInspectEvent(request(inspectPath, {
      method: "POST", cookie, body: { eventId: owner.event_id },
    }));
    await assertDenied(denied, 403);
  }

  const started = await startInspectEvent(request(inspectPath, {
    method: "POST", cookie: adminCookie, body: { eventId: owner.event_id },
  }));
  assert.equal(started.status, 200);
  const inspectCookie = cookieValue(started);
  const snapshot = await started.json();
  assert.equal(snapshot.realUser.id, admin.id);
  assert.equal(snapshot.impersonatedUser, null);
  assert.equal(snapshot.inspectedEventId, owner.event_id);
  assert.equal(snapshot.inspectedEventName, "Fixture Event A");
  assertNoStore(started);
  const claims = parseAuthSessionCookie(inspectCookie);
  assert.equal(claims.role, "super_admin");
  assert.equal(claims.userId, admin.id);
  assert.equal(claims.impersonating, false);
  assert.equal(claims.inspectedEventId, owner.event_id);
  // Inspecting keeps /admin access while also opening the event workspace.
  assert.equal(
    (await getAdminUsers(request("/api/admin/users", { cookie: inspectCookie }))).status,
    200,
  );
  const workspace = await getWorkspace(request("/api/event/workspace", { cookie: inspectCookie }));
  assert.equal(workspace.status, 200);
  assert.equal((await workspace.json()).eventId, owner.event_id);

  const grant = platformPermissions.find(
    (row) => row.user_id === admin.id,
  );
  grant.matrix.canInspection = false;
  await assertDenied(
    await getWorkspace(request("/api/event/workspace", { cookie: inspectCookie })),
    401,
  );

  grant.matrix.canInspection = true;
  const restored = await stopInspectEvent(request(inspectPath, {
    method: "DELETE", cookie: inspectCookie,
  }));
  assert.equal(restored.status, 200);
  const restoredClaims = parseAuthSessionCookie(cookieValue(restored));
  assert.equal(restoredClaims.userId, admin.id);
  assert.equal(restoredClaims.impersonating, false);
  assert.equal(restoredClaims.inspectedEventId, null);
  assert.equal(restoredClaims.expiresAt, parseAuthSessionCookie(adminCookie).expiresAt);
  assert.equal((await restored.json()).inspectedEventId, null);
});

test("admin user and event responses mask fields until the viewer has the current PII grant", async (t) => {
  const fixture = setupMockData(t);
  const { cookie: adminCookie } = await signIn(fixture.admin);
  const { cookie: reviewerCookie } = await signIn(fixture.reviewer);
  const { owner, assistant, assignable, reviewer, platformPermissions } = fixture;
  const paths = [
    [getAdminUsers, "/api/admin/users"],
    [getAdminUser, `/api/admin/users/${owner.id}`, context("id", owner.id)],
    [getAdminEvents, "/api/admin/events"],
    [getAdminEvent, "/api/admin/events/event-a", context("id", "event-a")],
    [getAssignableUsers, "/api/admin/events/assignable-users"],
  ];
  for (const [handler, path, params] of paths) {
    const response = await handler(request(path, { cookie: adminCookie }), params);
    assert.equal(response.status, 200, path);
    assertNoStore(response);
    assertNoPersonalDetails(await response.json(), [owner, assistant, assignable, reviewer]);
  }

  const responseWithGrant = await getAdminUsers(request("/api/admin/users", { cookie: reviewerCookie }));
  assert.equal(responseWithGrant.status, 200);
  assertNoStore(responseWithGrant);
  const unmasked = (await responseWithGrant.json()).users.find((user) => user.id === owner.id);
  assert.equal(unmasked.name, owner.display_name);
  assert.equal(unmasked.email, owner.email);
  assert.equal("password" in unmasked, false);

  const reviewerAccess = platformPermissions.find(
    (row) => row.user_id === reviewer.id,
  );
  reviewerAccess.matrix.canViewUnmaskedPii = false;
  const afterRevocation = await getAdminUsers(request("/api/admin/users", { cookie: reviewerCookie }));
  assert.equal(afterRevocation.status, 200);
  assertNoPersonalDetails(await afterRevocation.json(), [owner, assistant]);
});

test("upstream failure details stay in the API layer", async (t) => {
  const { admin, owner, failures } = setupMockData(t);
  const { cookie } = await signIn(admin);
  failures.set("/users", `Request failed for ${owner.email}`);

  const response = await getAdminUsers(request("/api/admin/users", { cookie }));
  assert.equal(response.status, 502);
  assertNoPersonalDetails(await response.json(), [owner]);
});

test("admin can create events with either owner mode and an invite failure preserves the draft", async (t) => {
  const { admin, assignable, collections } = setupMockData(t, { eventWrites: true });
  assignable.role_id = "previous-event-role";
  const { cookie } = await signIn(admin);
  const invitations = [];
  const create = createEventHandler(async (invitation) => {
    invitations.push(invitation.to);
    throw new Error("Fixture mail delivery failed");
  });
  const existingInput = {
    mode: "existing",
    slug: "qa-existing-owner",
    titleEn: "Existing owner",
    titleTh: "",
    existingUserId: assignable.id,
  };

  for (const input of [existingInput, newEventInput]) {
    const response = await create(createEventRequest(cookie, input));
    assert.equal(response.status, 201);
    const result = await response.json();
    const assigned = collections.users.find((user) => user.id === result.event.adminUserId);
    const access = collections.event_access.find(
      (row) => row.user_id === assigned.id && row.event_id === result.event.id,
    );
    const isExisting = input.mode === "existing";
    assert.equal(result.event.slug, input.slug);
    assert.equal(result.event.title, input.titleEn);
    assert.equal(result.event.status, "draft");
    assert.equal(result.impersonateUserId, isExisting ? assignable.id : null);
    assert.equal(result.inviteSent, false);
    assert.equal(assigned.status, isExisting ? "active" : "invited");
    assert.equal(assigned.event_id, result.event.id);
    assert.equal(assigned.role_id, isExisting ? null : undefined);
    if (!isExisting) assert.equal(assigned.platform_role_id, undefined);
    assert.ok(access);
    assert.equal(access.can_manage_sub_users, true);
    assert.equal(access.matrix.event, "can_edit");
    assert.equal(collections.event_translations.filter((item) => item.event_id === result.event.id).length, isExisting ? 1 : 2);
    assertNoPersonalDetails(result, [assigned]);
  }
  assert.deepEqual(invitations, [newEventInput.adminEmail]);
});

test("upstream write failures roll back created resources and allow resubmission", async (t) => {
  for (const mode of ["new", "existing"]) {
    await t.test(mode, async (t) => {
      const { admin, assignable, collections, failures } = setupMockData(t, { eventWrites: true });
      const { cookie } = await signIn(admin);
      const create = createEventHandler();
      const baseline = structuredClone(collections);
      const input = mode === "new" ? newEventInput : {
        mode,
        slug: "qa-existing-owner",
        titleEn: "Existing owner",
        titleTh: "",
        existingUserId: assignable.id,
      };
      // new: fail after access is staged by rejecting the invited user write
      // existing: fail the owner assignment patch
      const failingRequest =
        mode === "new" ? "POST /users" : "PATCH /users/" + assignable.id;
      failures.set(failingRequest, "Fixture upstream write rejected");

      const failed = await create(createEventRequest(cookie, input));
      assert.equal(failed.status, 502);
      assert.deepEqual(await failed.json(), { error: "MOCK_API_ERROR" });
      assert.deepEqual(collections, baseline);

      failures.delete(failingRequest);
      const retried = await create(createEventRequest(cookie, input));
      assert.equal(retried.status, 201);
      assert.equal((await retried.json()).event.slug, input.slug);
    });
  }
});

test("read-only upstream storage returns a safe error and creates no owner", async (t) => {
  const { admin, collections, failures } = setupMockData(t, { eventWrites: true });
  const { cookie } = await signIn(admin);
  const create = createEventHandler();
  const baseline = structuredClone(collections);
  failures.set("POST /events", "EROFS: read-only file system, open '/private/db.json'");

  const response = await create(createEventRequest(cookie, newEventInput));
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "MOCK_READ_ONLY" });
  assert.deepEqual(collections, baseline);
});

test("setup-password requires a current invitation and masks preview details", async (t) => {
  const { invited, calls } = setupMockData(t);
  const { issueSetupPasswordInvite, SETUP_PASSWORD_INVITE_DAYS } = load("src/core/auth/setup-password-invite.ts");
  const { GET: previewInvite, POST: acceptInvite } = load("src/app/api/auth/setup-password/[userId]/route.ts");
  const expired = issueSetupPasswordInvite(
    invited.id,
    Date.now() - (SETUP_PASSWORD_INVITE_DAYS + 1) * 86_400_000,
  );

  for (const invalid of ["invalid", expired]) {
    await assertDenied(await previewInvite(
      request(`/api/auth/setup-password/${invalid}`),
      context("userId", invalid),
    ), 404);
  }
  assert.deepEqual(calls, []);

  const token = issueSetupPasswordInvite(invited.id);
  const path = `/api/auth/setup-password/${token}`;
  const invite = context("userId", token);
  const response = await previewInvite(
    request(path),
    invite,
  );
  assert.equal(response.status, 200);
  assertNoStore(response);
  const preview = await response.json();
  assert.equal(preview.userId, invited.id);
  assertNoPersonalDetails(preview, [invited]);

  const newPassword = "different-fixture-password";
  const submission = {
    method: "POST",
    body: { password: newPassword, confirmPassword: newPassword },
  };
  const accepted = await acceptInvite(request(path, submission), invite);
  assert.equal(accepted.status, 200);
  assert.deepEqual(await accepted.json(), { ok: true });
  assert.equal(invited.status, "active");
  assert.equal(invited.password, newPassword);
  await assertDenied(await acceptInvite(request(path, submission), invite), 410);
  assert.equal(calls.filter(({ method }) => method === "PATCH").length, 1);
});
