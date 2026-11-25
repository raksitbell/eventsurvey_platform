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
const { GET: getLoginTrialAccounts } = load("src/app/api/auth/trial-accounts/route.ts");
const { POST: logout } = load("src/app/api/auth/logout/route.ts");
const { GET: getSession } = load("src/app/api/auth/session/route.ts");
const { POST: startInspectEvent, DELETE: stopInspectEvent } = load("src/app/api/auth/inspect-event/route.ts");
const { GET: getAdminUsers } = load("src/app/api/admin/users/route.ts");
const { GET: getAdminUser, PATCH: patchAdminUser } = load("src/app/api/admin/users/[id]/route.ts");
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
  for (const [cookie, expected] of [[adminCookie, true], [reviewerCookie, false]]) {
    const session = await getSession(request("/api/auth/session", { cookie }));
    assert.equal((await session.json()).canInspection, expected);
  }
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

test("User Management returns full display fields to user viewers and restricts reads and edits by module access", async (t) => {
  const { reviewer, assistant, owner, platformPermissions } = setupMockData(t);
  const matrix = platformPermissions.find((row) => row.user_id === reviewer.id).matrix;
  matrix.canViewUnmaskedPii = false;
  assistant.phone = "+66 89 123 4567";
  const { cookie } = await signIn(reviewer);
  const detail = `/api/admin/users/${assistant.id}`;
  const params = context("id", assistant.id);

  const list = await getAdminUsers(request("/api/admin/users", { cookie }));
  assert.equal(list.status, 200);
  assertNoStore(list);
  const row = (await list.json()).users.find((user) => user.id === assistant.id);
  assert.equal(row.name, assistant.display_name);
  assert.equal(row.email, assistant.email);
  assert.equal(row.phone, assistant.phone);
  assert.equal(row.ownerName, owner.display_name);
  assert.equal("password" in row, false);

  const profile = await getAdminUser(request(detail, { cookie }), params);
  assert.equal(profile.status, 200);
  assertNoStore(profile);
  assert.deepEqual((await profile.json()).user, row);
  await assertDenied(await patchAdminUser(request(detail, {
    method: "PATCH", cookie, body: { role: "event_owner" },
  }), params), 403);

  matrix.users = "restricted";
  matrix.canViewUnmaskedPii = true;
  await assertDenied(await getAdminUsers(request("/api/admin/users", { cookie })), 403);
  await assertDenied(await getAdminUser(request(detail, { cookie }), params), 403);
});

test("saving a role change from the edit form keeps the full name and email", async (t) => {
  const { admin, assistant } = setupMockData(t, { eventWrites: true });
  const { cookie } = await signIn(admin);
  const detail = `/api/admin/users/${assistant.id}`;
  const params = context("id", assistant.id);
  const expectedName = assistant.display_name;
  const expectedEmail = assistant.email;
  const { user } = await (await getAdminUser(request(detail, { cookie }), params)).json();
  const result = await patchAdminUser(request(detail, {
    method: "PATCH", cookie,
    body: { name: user.name, email: user.email, role: "event_owner" },
  }), params);
  assert.equal(result.status, 200);
  assert.equal(assistant.display_name, expectedName);
  assert.equal(assistant.email, expectedEmail);
  const saved = await (await getAdminUser(request(detail, { cookie }), params)).json();
  assert.equal(saved.user.role, "event_owner");
});

test("the public trial picker exposes only display fields for active, login-eligible trial accounts", async (t) => {
  const { admin, reviewer, owner, assistant, otherOwner, invited, assignable, collections, failures } = setupMockData(t);
  Object.assign(admin, { email: "admin@example.com" });
  Object.assign(reviewer, { email: "kittisak@example.com", is_trial: false });
  Object.assign(owner, { email: "Thanawat@Example.com" });
  assistant.is_trial = true;
  otherOwner.is_trial = true;
  collections.events[1].deleted_at = "2026-11-20T00:00:00Z";
  invited.is_trial = true;
  assignable.is_trial = true;
  const response = await getLoginTrialAccounts();
  assert.equal(response.status, 200);
  assertNoStore(response);
  assert.equal(response.headers.get("set-cookie"), null);
  assert.deepEqual(await response.json(), { accounts: [
    { email: admin.email, role: "super_admin" },
    { email: owner.email, role: "event_owner" },
    { email: assistant.email, role: "sub_user" },
  ] });
  admin.removed_at = "2026-11-20T00:00:00Z";
  owner.status = "suspended";
  collections.event_access.find((row) => row.user_id === assistant.id).can_manage_sub_users = true;
  assert.deepEqual(await (await getLoginTrialAccounts()).json(), { accounts: [
    { email: assistant.email, role: "event_owner" },
  ] });

  failures.set("/users", "private upstream diagnostics");
  const failed = await getLoginTrialAccounts();
  assert.equal(failed.status, 503);
  assertNoStore(failed);
  assert.deepEqual(await failed.json(), { error: "TRIAL_ACCOUNTS_UNAVAILABLE" });
});

test("the trial picker signals the published preset only for matching current demo credentials", async (t) => {
  const { admin, reviewer, owner, assistant, otherOwner } = setupMockData(t);
  const { PUBLISHED_DEMO_PASSWORD } = load("src/core/auth/demo-preset.ts");
  Object.assign(admin, { email: "admin@example.com", password: PUBLISHED_DEMO_PASSWORD });
  Object.assign(owner, { email: "Thanawat@Example.com", password: PUBLISHED_DEMO_PASSWORD });
  Object.assign(assistant, { email: "kittisak@example.com", password: PUBLISHED_DEMO_PASSWORD });
  Object.assign(otherOwner, { is_trial: true, password: PUBLISHED_DEMO_PASSWORD });
  reviewer.password = PUBLISHED_DEMO_PASSWORD;

  async function listed() {
    const response = await getLoginTrialAccounts();
    assert.equal(response.status, 200);
    assertNoStore(response);
    return (await response.json()).accounts;
  }
  const initial = await listed();
  assert.deepEqual(initial.filter((row) => row.usesPublishedPassword).map((row) => row.email).sort(),
    [admin.email, owner.email, assistant.email].sort());
  assert.deepEqual(initial.find((row) => row.email === admin.email), {
    email: admin.email, role: "super_admin", usesPublishedPassword: true,
  });
  assert.deepEqual(initial.find((row) => row.email === otherOwner.email), {
    email: otherOwner.email, role: "event_owner",
  });
  assert.ok(!initial.some((row) => row.email === reviewer.email));

  admin.password = "changed-fixture-only";
  owner.is_trial = false;
  assistant.removed_at = "2026-11-20T00:00:00Z";
  const updated = await listed();
  assert.deepEqual(updated.find((row) => row.email === admin.email), { email: admin.email, role: "super_admin" });
  assert.ok(!updated.some((row) => row.email === owner.email || row.email === assistant.email));
  assert.ok(!updated.some((row) => row.usesPublishedPassword));
});

test("the trial account filter uses seed identities and explicit flags within User Management permissions", async (t) => {
  const { admin, reviewer, owner, assistant, otherOwner, invited, platformPermissions } = setupMockData(t);
  const { cookie } = await signIn(reviewer);
  const path = "/api/admin/users?trial=true";
  owner.email = "  Thanawat@Example.com ";
  assistant.is_trial = true;
  Object.assign(otherOwner, { email: "kittisak@example.com", is_trial: false });
  Object.assign(invited, { is_trial: true, removed_at: "2026-01-01T00:00:00Z" });
  admin.email = "other@example.com";

  await assertDenied(await getAdminUsers(request(path)), 401);
  const response = await getAdminUsers(request(path, { cookie }));
  assert.equal(response.status, 200);
  assertNoStore(response);
  const { users, meta } = await response.json();
  assert.deepEqual(users.map((row) => row.id).sort(), [owner.id, assistant.id].sort());
  assert.deepEqual(meta, { total: 2, byRole: { event_owner: 1, sub_user: 1 } });
  assert.ok(users.every((row) => !("password" in row)));
  const owners = await getAdminUsers(request(path + "&role=event_owner", { cookie }));
  assert.deepEqual((await owners.json()).users.map((row) => row.id), [owner.id]);
  const ordinary = await getAdminUsers(request("/api/admin/users", { cookie }));
  assert.ok((await ordinary.json()).users.some((row) => row.id === otherOwner.id));

  platformPermissions.find((row) => row.user_id === reviewer.id).matrix.users = "restricted";
  await assertDenied(await getAdminUsers(request(path, { cookie })), 403);
});

function useTrialDemoBackend(t, demoBase) {
  const previous = process.env.TRIAL_DEMO_API_BASE_URL;
  process.env.TRIAL_DEMO_API_BASE_URL = demoBase;
  t.after(() => {
    if (previous === undefined) delete process.env.TRIAL_DEMO_API_BASE_URL;
    else process.env.TRIAL_DEMO_API_BASE_URL = previous;
  });
  return loadSource();
}

test("an unconfigured deployment can provision public trial passwords only on the published mock API", (t) => {
  useTrialDemoBackend(t, "");
  const canProvision = (base) => loadSource({
    "@/core/api/mock-client": { ...load("src/core/api/mock-client.ts"), MOCK_API_BASE_URL: base },
  })("src/services/auth/public-demo.ts").canCreatePublicDemoTrial();
  assert.equal(canProvision("https://eventmockapi.vercel.app"), true);
  assert.equal(canProvision("https://eventmockapi.vercel.app.example.test"), false);
  assert.equal(canProvision(origin), false);
});

test("a newly published trial signs in from the anonymous picker until its password changes", async (t) => {
  const { admin, collections } = setupMockData(t, { eventWrites: true });
  const api = useTrialDemoBackend(t, origin);
  const { PUBLISHED_DEMO_PASSWORD } = api("src/core/auth/demo-preset.ts");
  const { POST: create } = api("src/app/api/admin/users/route.ts");
  const { GET: picker } = api("src/app/api/auth/trial-accounts/route.ts");
  const { POST: submitLogin } = api("src/app/api/auth/login/route.ts");
  const { PATCH: edit } = api("src/app/api/admin/users/[id]/route.ts");
  const { cookie } = await signIn(admin);
  const email = "published-trial@example.test";
  const body = {
    name: "Published trial", email, role: "sub_user", eventId: "event-a",
    isTrial: true, usePublishedPassword: true,
  };
  const result = await create(request("/api/admin/users", { method: "POST", cookie, body }));
  assert.equal(result.status, 201);
  const { id } = await result.json();
  const stored = collections.users.find((row) => row.id === id);
  assert.equal(stored.uses_published_trial_password, true);

  const publicAccount = async () => {
    const response = await picker();
    assert.equal(response.status, 200);
    assertNoStore(response);
    return (await response.json()).accounts.find((row) => row.email === email);
  };
  const loginAsTrial = (password) => submitLogin(request("/api/auth/login", { method: "POST", body: { email, password } }));
  assert.deepEqual(await publicAccount(), { email, role: "sub_user", usesPublishedPassword: true });
  const signedIn = await loginAsTrial(PUBLISHED_DEMO_PASSWORD);
  assert.equal(signedIn.status, 200);
  const { GET: readSession } = api("src/app/api/auth/session/route.ts");
  const session = await readSession(request("/api/auth/session", { cookie: cookieValue(signedIn) }));
  assert.equal(session.status, 200);
  assert.equal((await session.json()).realUser.id, id);

  const changed = await edit(request(`/api/admin/users/${id}?trial=true`, {
    method: "PATCH", cookie, body: { password },
  }), context("id", id));
  assert.equal(changed.status, 200);
  assert.equal(stored.uses_published_trial_password, false);
  assert.deepEqual(await publicAccount(), { email, role: "sub_user" });
  assert.equal((await loginAsTrial(PUBLISHED_DEMO_PASSWORD)).status, 401);
  assert.equal((await loginAsTrial(password)).status, 200);
});

test("the public trial preset requires a matching demo backend and an explicit trial-only request", async (t) => {
  const { admin, reviewer, owner, collections } = setupMockData(t, { eventWrites: true });
  const { cookie } = await signIn(admin);
  const viewer = await signIn(reviewer);
  const before = collections.users.length;
  const body = {
    name: "New trial", email: "new-trial@example.test", role: "sub_user", eventId: "event-a",
    isTrial: true, usePublishedPassword: true,
  };
  const submit = (handler, input, cookie) => handler(request("/api/admin/users", { method: "POST", cookie, body: input }));
  await t.test("matching demo API", async (t) => {
    const api = useTrialDemoBackend(t, origin);
    const { POST: create } = api("src/app/api/admin/users/route.ts");
    await assertDenied(await submit(create, body), 401, "anonymous");
    await assertDenied(await submit(create, body, viewer.cookie), 403, "view-only administrator");
    for (const invalid of [{ isTrial: false }, { isTrial: undefined }, { password }, { usePublishedPassword: "true" }]) {
      await assertDenied(await submit(create, { ...body, ...invalid }, cookie), 400, Object.keys(invalid)[0]);
    }
    assert.equal(collections.users.length, before);
  });
  await t.test("different demo API", async (t) => {
    const api = useTrialDemoBackend(t, origin + "/other");
    const { POST: create } = api("src/app/api/admin/users/route.ts");
    await assertDenied(await submit(create, body, cookie), 403, "another mock API");
    assert.equal(collections.users.length, before);

    const originalSession = await signIn(owner);
    const { PUBLISHED_DEMO_PASSWORD } = api("src/core/auth/demo-preset.ts");
    Object.assign(owner, { is_trial: true, uses_published_trial_password: true, password: PUBLISHED_DEMO_PASSWORD });
    const { GET: picker } = api("src/app/api/auth/trial-accounts/route.ts");
    assert.deepEqual((await (await picker()).json()).accounts, []);
    const { POST: submitLogin } = api("src/app/api/auth/login/route.ts");
    await assertDenied(await submitLogin(request("/api/auth/login", {
      method: "POST", body: { email: owner.email, password: PUBLISHED_DEMO_PASSWORD },
    })), 401, "published trial from another mock API");
    const { GET: readSession } = api("src/app/api/auth/session/route.ts");
    await assertDenied(await readSession(request("/api/auth/session", {
      cookie: originalSession.cookie,
    })), 401, "existing session for a copied trial");
  });
});

test("renaming an account and reusing a seed email preserve the original account's trial classification", async (t) => {
  const { admin, owner, otherOwner } = setupMockData(t, { eventWrites: true });
  const { cookie } = await signIn(admin);
  const { POST: create } = load("src/app/api/admin/users/route.ts");
  const seedEmail = "kittisak@example.com";
  owner.email = seedEmail;
  const rename = (user, email) => patchAdminUser(request("/api/admin/users/" + user.id, {
    method: "PATCH", cookie, body: { email },
  }), context("id", user.id));
  assert.equal((await rename(owner, "changed@example.test")).status, 200);
  assert.equal(owner.is_trial, true);
  assert.equal((await rename(otherOwner, "thanawat@example.com")).status, 200);
  assert.equal(otherOwner.is_trial, false);
  const created = await create(request("/api/admin/users", {
    method: "POST", cookie, body: { email: seedEmail, name: "New owner", role: "event_owner", password },
  }));
  assert.equal(created.status, 201);
  const trial = await getAdminUsers(request("/api/admin/users?trial=true", { cookie }));
  assert.deepEqual((await trial.json()).users.map((row) => row.id), [owner.id]);
});

test("a user manager can add and remove an existing trial account without changing its access or credentials", async (t) => {
  const { admin, reviewer, owner, invited, assignable, collections } = setupMockData(t, { eventWrites: true });
  const manager = (await signIn(admin)).cookie;
  const viewer = (await signIn(reviewer)).cookie;
  const { DELETE: deleteUser } = load("src/app/api/admin/users/[id]/route.ts");
  const path = `/api/admin/users/${owner.id}?trial=true`;
  const list = (cookie) => getAdminUsers(request("/api/admin/users?trial=eligible", { cookie }));
  const change = (cookie, id, isTrial) => patchAdminUser(request(`/api/admin/users/${id}?trial=true`, {
    method: "PATCH", cookie, body: { isTrial },
  }), context("id", id));
  const picker = async () => (await (await getLoginTrialAccounts()).json()).accounts;
  const access = structuredClone(collections.event_access);
  const userCount = collections.users.length;
  const { password: originalPassword, event_id: originalEvent } = owner;

  await assertDenied(await list(viewer), 403);
  await assertDenied(await change(viewer, owner.id, true), 403);
  assert.equal((await change(manager, invited.id, true)).status, 409);
  assert.equal((await change(manager, assignable.id, true)).status, 409);
  const { users } = await (await list(manager)).json();
  assert.deepEqual(users.find((user) => user.id === owner.id), { id: owner.id, name: owner.display_name, email: owner.email });
  assert.equal(users.some((user) => user.id === assignable.id || user.id === invited.id), false);

  assert.equal((await change(manager, owner.id, true)).status, 200);
  assert.equal((await change(manager, owner.id, true)).status, 200);
  assert.deepEqual(await picker(), [{ email: owner.email, role: "event_owner" }]);
  assert.equal((await (await list(manager)).json()).users.some((user) => user.id === owner.id), false);
  const trial = await getAdminUsers(request("/api/admin/users?trial=true", { cookie: manager }));
  assert.equal((await trial.json()).users[0].trialAddedFromExisting, true);
  assert.equal((await deleteUser(request(path, { method: "DELETE", cookie: manager }), context("id", owner.id))).status, 409);

  assert.equal((await change(manager, owner.id, false)).status, 200);
  assert.deepEqual(await picker(), []);
  assert.equal(owner.password, originalPassword);
  assert.equal(owner.event_id, originalEvent);
  assert.equal(owner.status, "active");
  assert.equal(owner.removed_at, null);
  assert.equal(collections.users.length, userCount);
  assert.deepEqual(collections.event_access, access);
  await signIn(owner);
});

test("existing event users can keep the published password only on the designated demo backend", async (t) => {
  const { admin, owner, reviewer } = setupMockData(t, { eventWrites: true });
  const { PUBLISHED_DEMO_PASSWORD } = load("src/core/auth/demo-preset.ts");
  owner.password = PUBLISHED_DEMO_PASSWORD;
  reviewer.password = PUBLISHED_DEMO_PASSWORD;
  const { cookie } = await signIn(admin);
  const list = async () => (await (await getAdminUsers(request("/api/admin/users?trial=eligible", { cookie }))).json()).users;
  const change = (user, isTrial) => patchAdminUser(request(`/api/admin/users/${user.id}?trial=true`, {
    method: "PATCH", cookie, body: { isTrial },
  }), context("id", user.id));
  const picker = async () => (await (await getLoginTrialAccounts()).json()).accounts;

  useTrialDemoBackend(t, "");
  assert.equal((await list()).some((user) => user.id === owner.id), false);
  assert.equal((await change(owner, true)).status, 409);

  process.env.TRIAL_DEMO_API_BASE_URL = origin;
  assert.ok((await list()).some((user) => user.id === owner.id && user.usesPublishedPassword));
  assert.equal((await change(reviewer, true)).status, 409);
  assert.equal((await change(owner, true)).status, 200);
  assert.deepEqual(await picker(), [{ email: owner.email, role: "event_owner", usesPublishedPassword: true }]);
  assert.equal(owner.password, PUBLISHED_DEMO_PASSWORD);

  process.env.TRIAL_DEMO_API_BASE_URL = "";
  assert.deepEqual(await picker(), []);
  process.env.TRIAL_DEMO_API_BASE_URL = origin;
  assert.equal((await change(owner, false)).status, 200);
  assert.deepEqual(await picker(), []);
  assert.equal(owner.password, PUBLISHED_DEMO_PASSWORD);
  assert.equal(owner.uses_published_trial_password, false);
});

test("a user manager can create, edit and remove a trial account while ordinary accounts stay outside trial deletion", async (t) => {
  const { admin, reviewer, owner, collections } = setupMockData(t, { eventWrites: true });
  const manager = (await signIn(admin)).cookie;
  const viewer = (await signIn(reviewer)).cookie;
  const { POST: create } = load("src/app/api/admin/users/route.ts");
  const { DELETE: remove } = load("src/app/api/admin/users/[id]/route.ts");
  const body = {
    name: "QA Trial Editor", email: "qa-trial@example.test", password,
    role: "sub_user", eventId: "event-a", isTrial: true,
  };
  const createAs = (cookie, input = body) => create(request("/api/admin/users", {
    method: "POST", cookie, body: input,
  }));
  const removeAs = (cookie, id, query = "?trial=true") => remove(
    request(`/api/admin/users/${id}${query}`, { method: "DELETE", cookie }),
    context("id", id),
  );
  const trialIds = async () => {
    const response = await getAdminUsers(request("/api/admin/users?trial=true", { cookie: manager }));
    assert.equal(response.status, 200);
    return (await response.json()).users.map((row) => row.id);
  };

  await assertDenied(await createAs(undefined), 401);
  await assertDenied(await createAs(viewer), 403);
  const invalid = await createAs(manager, { ...body, isTrial: "true" });
  assert.equal(invalid.status, 400);
  assert.equal((await invalid.json()).error, "INVALID_TRIAL_FLAG");
  assert.deepEqual(await trialIds(), []);
  const created = await createAs(manager);
  assert.equal(created.status, 201);
  const { id } = await created.json();
  const user = collections.users.find((row) => row.id === id);
  assert.equal(user.is_trial, true);
  const access = collections.event_access.find((row) => row.user_id === id);
  assert.equal(access.event_id, body.eventId);
  assert.deepEqual(await trialIds(), [id]);
  const publicAccounts = async () => (await (await getLoginTrialAccounts()).json()).accounts;
  assert.deepEqual(await publicAccounts(), [{ email: body.email, role: "sub_user" }]);
  const submit = (email, password) => login(request("/api/auth/login", { method: "POST", body: { email, password } }));
  assert.equal((await submit(body.email)).status, 400);
  assert.equal((await submit(body.email, "wrong-password")).status, 401);
  assert.equal((await submit(body.email, password)).status, 200);
  assert.equal((await createAs(manager)).status, 409);
  const detail = (targetId) => getAdminUser(request(`/api/admin/users/${targetId}?trial=true`, {
    cookie: viewer,
  }), context("id", targetId));
  const editEmail = (targetId, email) => patchAdminUser(request(`/api/admin/users/${targetId}?trial=true`, {
    method: "PATCH", cookie: manager, body: { email },
  }), context("id", targetId));
  assert.equal((await detail(id)).status, 200);
  assert.equal((await detail(owner.id)).status, 404);
  const originalOwnerEmail = owner.email;
  assert.equal((await editEmail(owner.id, "stale-trial@example.test")).status, 404);
  assert.equal(owner.email, originalOwnerEmail);
  const edit = await editEmail(id, "renamed-trial@example.test");
  assert.equal(edit.status, 200);
  assert.deepEqual(await publicAccounts(), [{ email: "renamed-trial@example.test", role: "sub_user" }]);
  assert.equal((await submit(body.email, password)).status, 401);
  assert.deepEqual(await trialIds(), [id]);

  await assertDenied(await removeAs(undefined, id), 401);
  await assertDenied(await removeAs(viewer, id), 403);
  const self = await removeAs(manager, admin.id);
  assert.equal(self.status, 400);
  assert.equal((await self.json()).error, "CANNOT_DELETE_SELF");
  assert.equal((await removeAs(manager, owner.id, "?trial=yes")).status, 400);
  assert.equal((await removeAs(manager, owner.id)).status, 404);
  assert.equal(owner.status, "active");
  assert.equal(user.removed_at, null);

  const removed = await removeAs(manager, id);
  assert.equal(removed.status, 200);
  assert.deepEqual(await removed.json(), { success: true });
  assert.ok(user.removed_at);
  assert.ok(access.deleted_at);
  assert.deepEqual(await publicAccounts(), []);
  assert.equal((await submit("renamed-trial@example.test", password)).status, 401);
  assert.deepEqual(await trialIds(), []);
  assert.equal((await detail(id)).status, 404);
  assert.equal((await editEmail(id, "removed-trial@example.test")).status, 404);
  assert.equal((await removeAs(manager, id)).status, 404);
  assert.equal((await removeAs(manager, owner.id, "")).status, 200);
});

test("users from a deleted draft can be assigned to another event with the selected role", async (t) => {
  const { admin, assistant, owner, collections } = setupMockData(t, { eventWrites: true });
  Object.assign(collections.events[0], { status: "draft", deleted_at: "2026-11-20T00:00:00Z" });
  const { cookie } = await signIn(admin);
  const list = await (await getAdminUsers(request("/api/admin/users", { cookie }))).json();
  assert.equal(list.events.some(({ id }) => id === "event-a"), false);
  for (const [account, role] of [[assistant, "sub_user"], [owner, "event_owner"]]) {
    const row = list.users.find((item) => item.id === account.id);
    assert.equal(row.eventId, null);
    assert.equal(row.customRoleName, null);
    assert.equal(row.role, role);
    const detail = `/api/admin/users/${account.id}`;
    const params = context("id", account.id);
    const response = await patchAdminUser(request(detail, {
      method: "PATCH", cookie, body: { eventId: "event-b" },
    }), params);
    assert.equal(response.status, 200);
    const { user } = await (await getAdminUser(request(detail, { cookie }), params)).json();
    assert.equal(user.eventId, "event-b");
    assert.equal(user.role, role);
    const access = collections.event_access.filter((entry) => entry.user_id === account.id && !entry.deleted_at);
    assert.deepEqual(access.map((entry) => entry.event_id), ["event-b"]);
    assert.equal(access[0].can_manage_sub_users, role === "event_owner");
  }
});

test("admin event responses still respect the current PII grant", async (t) => {
  const { reviewer, owner, assistant, assignable, platformPermissions } = setupMockData(t);
  const { cookie } = await signIn(reviewer);
  const response = await getAdminEvents(request("/api/admin/events", { cookie }));
  assert.equal(response.status, 200);
  const event = (await response.json()).events.find((item) => item.id === owner.event_id);
  assert.equal(event.adminName, owner.display_name);
  assert.equal(event.adminEmail, owner.email);

  platformPermissions.find((row) => row.user_id === reviewer.id).matrix.canViewUnmaskedPii = false;
  for (const [handler, path, params] of [
    [getAdminEvents, "/api/admin/events"],
    [getAdminEvent, "/api/admin/events/event-a", context("id", "event-a")],
    [getAssignableUsers, "/api/admin/events/assignable-users"],
  ]) {
    const restricted = await handler(request(path, { cookie }), params);
    assert.equal(restricted.status, 200, path);
    assertNoStore(restricted);
    assertNoPersonalDetails(await restricted.json(), [owner, assistant, assignable]);
  }
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

test("event deletion requires current platform event-management access and rechecks the lifecycle", async (t) => {
  const { admin, reviewer, owner, collections } = setupMockData(t, { eventWrites: true });
  const { DELETE: remove } = load("src/app/api/admin/events/[id]/route.ts");
  const event = collections.events[0];
  event.status = "closed";
  const path = `/api/admin/events/${event.id}`;
  const params = context("id", event.id);
  const deleteWith = (cookie) => remove(request(path, { method: "DELETE", cookie }), params);
  await assertDenied(await deleteWith(), 401);
  await assertDenied(await deleteWith((await signIn(owner)).cookie), 403);
  const viewOnly = await signIn(reviewer);
  await assertDenied(await deleteWith(viewOnly.cookie), 403);

  const { cookie } = await signIn(admin);
  const details = await getAdminEvent(request(path, { cookie }), params);
  assert.equal((await details.json()).status, "closed");
  for (const status of ["scheduled", "open"]) {
    event.status = status;
    const response = await deleteWith(cookie);
    assert.equal(response.status, 409);
    assert.equal((await response.json()).error, "EVENT_NOT_DELETABLE");
    assert.equal(event.status, status);
    assert.equal(event.deleted_at, undefined);
  }
  assert.equal(collections.audit_logs.some((row) => row.action === "delete"), false);
});

test("deleting a draft hides it, preserves its history and releases its owner for assignment", async (t) => {
  const { admin, assignable, collections, failures } = setupMockData(t, { eventWrites: true });
  const { DELETE: remove, PATCH: edit } = load("src/app/api/admin/events/[id]/route.ts");
  const { PATCH: changeStatus } = load("src/app/api/admin/events/[id]/status/route.ts");
  const { POST: runCron } = load("src/app/api/admin/events/cron/route.ts");
  const event = collections.events[0];
  event.status = "draft";
  assignable.event_id = event.id;
  collections.forms.push({
    id: "expired-form", event_id: event.id, type: "survey", status: "open",
    closes_at: "2000-01-01T00:00:00.000Z",
  });
  const { cookie } = await signIn(admin);
  const path = `/api/admin/events/${event.id}`;
  const params = context("id", event.id);
  const deleteEvent = () => remove(request(path, { method: "DELETE", cookie }), params);

  failures.set("PATCH /events/" + event.id, "fixture write failure");
  assert.equal((await deleteEvent()).status, 502);
  assert.equal(event.deleted_at, undefined);
  failures.clear();
  const results = await Promise.all([deleteEvent(), deleteEvent()]);
  assert.deepEqual(results.map((response) => response.status).sort(), [200, 404]);
  assert.equal(event.status, "draft");
  assert.ok(Number.isFinite(Date.parse(event.deleted_at)));
  assert.equal(event.updated_by, admin.id);
  const deletions = collections.audit_logs.filter((row) => row.action === "delete");
  assert.equal(deletions.length, 1);
  assert.equal(deletions[0].resource_id, event.id);
  assert.equal(deletions[0].actor_user_id, admin.id);

  const list = await getAdminEvents(request("/api/admin/events", { cookie }));
  assert.deepEqual((await list.json()).events.map((row) => row.id), ["event-b"]);
  for (const response of [
    await getAdminEvent(request(path, { cookie }), params),
    await edit(request(path, {
      method: "PATCH", cookie, body: { slug: event.slug, titleEn: "Edited", titleTh: "" },
    }), params),
    await changeStatus(request(path + "/status", {
      method: "PATCH", cookie, body: { action: "start" },
    }), params),
    await deleteEvent(),
  ]) {
    assert.equal(response.status, 404);
    assert.equal((await response.json()).error, "EVENT_NOT_FOUND");
  }
  const cron = await runCron(request("/api/admin/events/cron", { method: "POST", cookie }));
  assert.deepEqual(await cron.json(), { opened: [], closed: [], formsClosed: [] });
  assert.equal(collections.forms[0].status, "open");

  collections.form_submissions = [];
  const { GET: getOverview } = load("src/app/api/admin/overview/route.ts");
  const overview = await getOverview(request("/api/admin/overview", { cookie }));
  assert.equal(overview.status, 200);
  const { metrics } = await overview.json();
  assert.equal(metrics.events.total, 1);
  assert.equal(metrics.surveys.total, 0);

  const owners = await getAssignableUsers(request("/api/admin/events/assignable-users", { cookie }));
  assert.ok((await owners.json()).users.some((user) => user.id === assignable.id));
  const replacement = await createEventHandler()(createEventRequest(cookie, {
    mode: "existing", existingUserId: assignable.id, slug: "replacement-event", titleEn: "Replacement", titleTh: "",
  }));
  assert.equal(replacement.status, 201);
  const created = (await replacement.json()).event;
  assert.notEqual(created.id, event.id);
  assert.equal(assignable.event_id, created.id);
});

test("Trash lists deleted drafts and restores only with current event-management access", async (t) => {
  const { admin, reviewer, owner, collections, failures } = setupMockData(t, { eventWrites: true });
  const { POST: restore } = load("src/app/api/admin/events/[id]/restore/route.ts");
  const { DELETE: moveToTrash } = load("src/app/api/admin/events/[id]/route.ts");
  const { cookie } = await signIn(admin);
  const viewOnly = await signIn(reviewer);
  const event = collections.events[0];
  event.status = "draft";
  const params = context("id", event.id);
  const detailPath = `/api/admin/events/${event.id}`;
  const restoreWith = (session) => restore(request(detailPath + "/restore", { method: "POST", cookie: session }), params);
  const trashPath = "/api/admin/events?trash=true";
  const list = (path, session) => getAdminEvents(request(path, { cookie: session }));

  await assertDenied(await list(trashPath), 401);
  await assertDenied(await list(trashPath, (await signIn(owner)).cookie), 403);
  assert.equal((await moveToTrash(request(detailPath, { method: "DELETE", cookie }), params)).status, 200);
  const trash = await list(trashPath, viewOnly.cookie);
  assert.equal(trash.status, 200);
  assertNoStore(trash);
  assert.deepEqual((await trash.json()).events.map((row) => row.id), [event.id]);
  assert.deepEqual((await (await list(trashPath + "&q=unrelated", cookie)).json()).events, []);
  assert.equal((await getAdminEvent(request(detailPath, { cookie }), params)).status, 404);
  await assertDenied(await restoreWith(), 401);
  await assertDenied(await restoreWith(viewOnly.cookie), 403);

  const deletedAt = event.deleted_at;
  failures.set("PATCH /events/" + event.id, "fixture write failure");
  assert.equal((await restoreWith(cookie)).status, 502);
  assert.equal(event.deleted_at, deletedAt);
  failures.clear();
  const results = await Promise.all([restoreWith(cookie), restoreWith(cookie)]);
  assert.deepEqual(results.map((response) => response.status).sort(), [200, 409]);
  assert.equal(event.deleted_at, null);
  assert.equal(event.updated_by, admin.id);
  assert.equal(event.status, "draft");
  assert.deepEqual((await (await list(trashPath, cookie)).json()).events, []);
  assert.ok((await (await list("/api/admin/events", cookie)).json()).events.some((row) => row.id === event.id));
  assert.equal((await getAdminEvent(request(detailPath, { cookie }), params)).status, 200);
  const restorations = collections.audit_logs.filter((row) => row.action === "restore");
  assert.equal(restorations.length, 1);
  assert.equal(restorations[0].resource_id, event.id);
  assert.equal(restorations[0].actor_user_id, admin.id);
  const again = await restoreWith(cookie);
  assert.equal((await again.json()).error, "EVENT_NOT_RESTORABLE");
});

test("a platform event manager can trash and restore a closed event without reopening it", async (t) => {
  const { admin, collections } = setupMockData(t, { eventWrites: true });
  const { DELETE: remove } = load("src/app/api/admin/events/[id]/route.ts");
  const { POST: restore } = load("src/app/api/admin/events/[id]/restore/route.ts");
  const { cookie } = await signIn(admin);
  const event = collections.events[0];
  const closedAt = "2026-11-01T00:00:00.000Z";
  Object.assign(event, { status: "closed", closes_at: closedAt });
  const path = `/api/admin/events/${event.id}`;
  const params = context("id", event.id);
  const listClosed = async (trash) => {
    const response = await getAdminEvents(request(`/api/admin/events?status=closed&trash=${trash}`, { cookie }));
    assert.equal(response.status, 200);
    return (await response.json()).events.map(({ id, status }) => ({ id, status }));
  };
  const expected = [{ id: event.id, status: "closed" }];

  assert.equal((await remove(request(path, { method: "DELETE", cookie }), params)).status, 200);
  assert.deepEqual(await listClosed(false), []);
  assert.deepEqual(await listClosed(true), expected);
  assert.equal((await getAdminEvent(request(path, { cookie }), params)).status, 404);

  assert.equal((await restore(request(path + "/restore", { method: "POST", cookie }), params)).status, 200);
  assert.deepEqual(await listClosed(true), []);
  assert.deepEqual(await listClosed(false), expected);
  assert.equal(event.closes_at, closedAt);
});

test("restoring a draft preserves its content and the current assignments of moved users", async (t) => {
  const { admin, owner, collections } = setupMockData(t, { eventWrites: true });
  const { POST: restore } = load("src/app/api/admin/events/[id]/restore/route.ts");
  const { getAdminUserActivity } = load("src/services/admin/activity.ts");
  const { cookie } = await signIn(admin);
  const event = collections.events[0];
  const other = collections.events[1];
  const path = `/api/admin/events/${event.id}`;
  const restoreById = (id) => restore(request(`/api/admin/events/${id}/restore`, {
    method: "POST", cookie,
  }), context("id", id));
  assert.equal((await restoreById("absent-event")).status, 404);
  event.deleted_at = "2026-11-01T00:00:00.000Z";
  assert.equal((await restoreById(event.id)).status, 409, "open events cannot be restored");
  event.status = "draft";
  event.setup = "existing-draft-data";
  collections.forms.push({ id: "existing-form", event_id: event.id, status: "draft" });
  const previousAccess = collections.event_access.find((row) => row.user_id === owner.id);
  owner.event_id = other.id;
  collections.event_access.push({ ...previousAccess, id: "current-access", event_id: other.id });
  const grants = structuredClone(collections.event_access);

  const otherSlug = other.slug;
  other.slug = event.slug;
  const conflict = await restoreById(event.id);
  assert.equal(conflict.status, 409);
  assert.equal((await conflict.json()).error, "SLUG_EXISTS");
  assert.ok(event.deleted_at);
  other.slug = otherSlug;

  const restored = await restoreById(event.id);
  assert.equal(restored.status, 200);
  assert.equal(event.setup, "existing-draft-data");
  assert.equal(collections.forms[0].id, "existing-form");
  assert.equal(owner.event_id, other.id);
  assert.deepEqual(collections.event_access, grants);
  const detail = await getAdminEvent(request(path, { cookie }), context("id", event.id));
  assert.ok(!(await detail.json()).users.some((row) => row.id === owner.id));
  const profile = await getAdminUserActivity(owner.id);
  assert.deepEqual(profile.memberships.map((membership) => membership.id), [other.id]);
});
