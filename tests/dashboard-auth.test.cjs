/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node tests load TypeScript through the local harness. */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const { NextRequest, NextResponse } = require("next/server");
const { loadSource } = require("./support/load-source.cjs");

process.env.AUTH_SESSION_SECRET = "fixtures-only-dashboard-auth-signing-key";

function fixture({ allowImpersonation = true } = {}) {
  const accounts = new Map([
    [
      "platform",
      {
        id: "platform",
        display_name: "Fixture Platform Admin",
        system_role: "platform_admin",
        platform_role_id: "administrator",
        status: "active",
        email: "platform@example.test",
        password: "platform-fixture",
      },
    ],
    [
      "owner",
      {
        id: "owner",
        display_name: "Fixture Event Owner",
        system_role: "event_user",
        event_id: "event",
        role_id: "event-admin",
        status: "active",
        email: "owner@example.test",
        password: "fixture",
      },
    ],
    [
      "other-owner",
      {
        id: "other-owner",
        system_role: "event_user",
        event_id: "another-event",
        role_id: "another-admin",
        status: "active",
      },
    ],
    [
      "suspended",
      {
        id: "suspended",
        system_role: "event_user",
        event_id: "event",
        role_id: "event-admin",
        status: "suspended",
      },
    ],
  ]);
  let grant = allowImpersonation;
  const actions = [];

  class MockApiError extends Error {}
  class ReportingError extends Error {}

  const load = loadSource({
    "@/core/api/mock-client": {
      MockApiError,
      mockApi: {
        async get(path) {
          if (path.startsWith("/platform_access")) {
            const url = new URL(path, "https://fixture.test");
            const userId = url.searchParams.get("user_id");
            if (!grant) return [];
            const rows = [
              {
                id: "plat-platform",
                user_id: "platform",
                matrix: {
                  overview: "can_edit",
                  events: "can_edit",
                  users: "can_edit",
                  activity: "can_edit",
                  canInspection: true,
                  canViewUnmaskedPii: false,
                },
                deleted_at: null,
              },
            ];
            return userId
              ? rows.filter((row) => row.user_id === userId)
              : rows;
          }
          if (path.startsWith("/event_access")) {
            const url = new URL(path, "https://fixture.test");
            const userId = url.searchParams.get("user_id");
            const rows = [
              {
                id: "access-owner",
                user_id: "owner",
                event_id: "event",
                role_name: "Event Admin",
                can_manage_sub_users: true,
                matrix: {
                  event: "can_edit",
                  registrationForm: "can_edit",
                  surveyForm: "can_edit",
                  dashboard: "can_edit",
                  canViewSubmissions: true,
                  canManageSubmissions: true,
                  canExport: true,
                },
                deleted_at: null,
              },
              {
                id: "access-other",
                user_id: "other-owner",
                event_id: "another-event",
                role_name: "Event Admin",
                can_manage_sub_users: true,
                matrix: {
                  event: "can_edit",
                  registrationForm: "can_edit",
                  surveyForm: "can_edit",
                  dashboard: "can_edit",
                  canViewSubmissions: true,
                  canManageSubmissions: true,
                  canExport: true,
                },
                deleted_at: null,
              },
            ];
            return userId
              ? rows.filter((row) => row.user_id === userId)
              : rows;
          }
          if (path.startsWith("/users?")) {
            // Deliberately return unfiltered accounts, including the administrator first.
            return Array.from(accounts.values());
          }
          if (path.startsWith("/events/")) {
            const id = decodeURIComponent(path.slice("/events/".length));
            if (id === "event") {
              return {
                id: "event",
                slug: "fixture-event",
                default_locale: "th",
                deleted_at: null,
              };
            }
            return null;
          }
          if (path.startsWith("/event_translations")) {
            return [
              {
                event_id: "event",
                locale_code: "th",
                title: "Fixture Event",
              },
            ];
          }
          const id = path.match(/^\/users\/([^/?]+)$/)?.[1];
          assert.ok(id, `Unexpected fixture lookup: ${path}`);
          return accounts.get(id) ?? null;
        },
      },
    },
    "@/services/event/reporting": {
      ReportingError,
      async getReportingData(id, locale, _body, options) {
        const scopeId = options?.inspectedEventId || id;
        actions.push(["view", scopeId, locale]);
        return { id: scopeId, locale };
      },
      async restoreTrash(id, locale, itemId, options) {
        actions.push([
          "restore",
          options?.inspectedEventId || id,
          locale,
          itemId,
        ]);
        return { ok: true };
      },
    },
    "@/services/event/analytics": {
      async getAnalytics(_request, session) {
        actions.push(["analytics", session.userId, session.realUserId]);
        return { eventId: "event" };
      },
      async saveAnalyticsLayout(_request, session) {
        actions.push(["layout", session.userId, session.realUserId]);
        return { ok: true };
      },
    },
    "@/services/event/dashboard": {
      async publishDashboard(id, locale, _widgets, options) {
        actions.push(["publish", options?.inspectedEventId || id, locale]);
        return { widgets: [] };
      },
    },
  });

  const cookies = load("src/core/auth/cookie.ts");
  return {
    ...cookies,
    login: load("src/app/api/auth/login/route.ts").POST,
    logout: load("src/app/api/auth/logout/route.ts").POST,
    start: load("src/app/api/auth/inspect-event/route.ts").POST,
    stop: load("src/app/api/auth/inspect-event/route.ts").DELETE,
    dashboardApi: load("src/app/api/event/dashboard/route.ts").POST,
    dataApi: load("src/app/api/event/data/route.ts").GET,
    trashApi: load("src/app/api/event/trash/route.ts").POST,
    analyticsApi: load("src/app/api/event/analytics/route.ts").GET,
    layoutApi: load("src/app/api/event/analytics/layout/route.ts").PATCH,
    exportApi: load("src/app/api/event/analytics/export/route.ts").POST,
    actions,
    revokeGrant: () => {
      grant = false;
    },
  };
}

function cookieHeader(response) {
  return response.headers.get("set-cookie")?.split(";")[0] ?? "";
}

function signedCookie(env, id, expiresAt, role = "event_owner") {
  const response = new NextResponse();
  env.setAuthSessionCookie(
    response,
    {
      realUserId: id,
      userId: id,
      realRole: role,
      role,
      impersonating: false,
    },
    expiresAt,
  );
  return cookieHeader(response);
}

function request(path, { cookie = "", method = "GET", body } = {}) {
  return new NextRequest(`https://app.example.test${path}`, {
    method,
    headers: {
      cookie,
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function routingCookie(userId) {
  return `event_surway_session=${encodeURIComponent(
    JSON.stringify({
      userId,
      role: "event_owner",
      realRole: "super_admin",
      impersonating: true,
    }),
  )}`;
}

test("Dashboard APIs reject a missing verified session before calling services", async () => {
  const env = fixture();
  const cookie = routingCookie("owner");
  const cases = [
    [env.dataApi, request("/api/event/data", { cookie })],
    [env.analyticsApi, request("/api/event/analytics", { cookie })],
    [
      env.layoutApi,
      request("/api/event/analytics/layout", {
        cookie,
        method: "PATCH",
        body: {},
      }),
    ],
    [
      env.exportApi,
      request("/api/event/analytics/export?format=csv", {
        cookie,
        method: "POST",
      }),
    ],
    [
      env.dashboardApi,
      request("/api/event/dashboard", {
        cookie,
        method: "POST",
        body: { widgets: [] },
      }),
    ],
    [
      env.trashApi,
      request("/api/event/trash", {
        cookie,
        method: "POST",
        body: { id: "entry" },
      }),
    ],
  ];

  for (const [handler, req] of cases) {
    assert.equal((await handler(req)).status, 401);
  }
  assert.deepEqual(env.actions, []);
});

test("Dashboard uses the signed user, rejects expired or inactive sessions and keeps data private", async () => {
  const env = fixture();
  const cookie = `${signedCookie(env, "owner")}; ${routingCookie("other-owner")}`;
  const ownView = await env.dataApi(
    request("/api/event/data?locale=en", { cookie }),
  );
  assert.equal(ownView.status, 200);
  assert.equal(ownView.headers.get("cache-control"), "private, no-store");
  assert.deepEqual(await ownView.json(), { id: "owner", locale: "en" });
  assert.deepEqual(env.actions, [["view", "owner", "en"]]);

  const expired = signedCookie(env, "owner", Date.now() - 1000);
  assert.equal(
    (await env.dataApi(request("/api/event/data", { cookie: expired }))).status,
    401,
  );
  for (const id of ["suspended", "missing"]) {
    const invalid = signedCookie(env, id);
    assert.equal(
      (await env.dataApi(request("/api/event/data", { cookie: invalid })))
        .status,
      401,
    );
  }
  const platform = signedCookie(env, "platform", undefined, "super_admin");
  assert.equal(
    (await env.dataApi(request("/api/event/data", { cookie: platform })))
      .status,
    403,
  );
  assert.equal(env.actions.length, 1);
});

test("Dashboard event inspection needs canInspection and keeps full write access", async () => {
  const env = fixture();
  const cookie = signedCookie(env, "platform", undefined, "super_admin");
  const start = await env.start(
    request("/api/auth/inspect-event", {
      cookie,
      method: "POST",
      body: { eventId: "event" },
    }),
  );
  assert.equal(start.status, 200);
  const inspectCookie = cookieHeader(start);
  const started = env.readAuthSession(
    request("/api/event/data", { cookie: inspectCookie }),
  );
  assert.equal(started.role, "super_admin");
  assert.equal(started.inspectedEventId, "event");
  assert.equal(started.impersonating, false);

  const view = await env.dataApi(
    request("/api/event/data", { cookie: inspectCookie }),
  );
  assert.equal(view.status, 200);
  assert.deepEqual(await view.json(), { id: "event", locale: "th" });

  const publish = await env.dashboardApi(
    request("/api/event/dashboard", {
      cookie: inspectCookie,
      method: "POST",
      body: { widgets: [] },
    }),
  );
  const restore = await env.trashApi(
    request("/api/event/trash", {
      cookie: inspectCookie,
      method: "POST",
      body: { id: "entry" },
    }),
  );
  const analytics = await env.analyticsApi(
    request("/api/event/analytics", { cookie: inspectCookie }),
  );
  const layout = await env.layoutApi(
    request("/api/event/analytics/layout", {
      cookie: inspectCookie,
      method: "PATCH",
      body: {},
    }),
  );
  assert.equal(analytics.status, 200);
  assert.equal(publish.status, 200);
  assert.equal(restore.status, 200);
  assert.equal(layout.status, 200);
  assert.deepEqual(env.actions, [
    ["view", "event", "th"],
    ["publish", "event", "th"],
    ["restore", "event", "th", "entry"],
    ["analytics", "platform", "platform"],
    ["layout", "platform", "platform"],
  ]);

  env.revokeGrant();
  assert.equal(
    (await env.dataApi(request("/api/event/data", { cookie: inspectCookie })))
      .status,
    401,
  );
  const end = await env.stop(
    request("/api/auth/inspect-event", {
      cookie: inspectCookie,
      method: "DELETE",
    }),
  );
  assert.equal(end.status, 200);
  const restored = env.readAuthSession(
    request("/api/event/data", { cookie: cookieHeader(end) }),
  );
  assert.equal(restored.userId, "platform");
  assert.equal(restored.impersonating, false);
  assert.equal(restored.inspectedEventId, null);

  const startWithoutGrant = await env.start(
    request("/api/auth/inspect-event", {
      cookie,
      method: "POST",
      body: { eventId: "event" },
    }),
  );
  assert.equal(startWithoutGrant.status, 403);
});

test("Login signs only exact active credentials even when mock users are unfiltered", async () => {
  const env = fixture();
  const signIn = await env.login(
    request("/api/auth/login", {
      method: "POST",
      body: { email: "owner@example.test", password: "fixture" },
    }),
  );
  assert.equal(signIn.status, 200);
  assert.match(signIn.headers.get("set-cookie"), /HttpOnly/i);
  assert.match(signIn.headers.get("set-cookie"), /SameSite=lax/i);
  const { user } = await signIn.json();
  assert.equal(user.id, "owner");
  assert.equal(user.role, "event_owner");
  assert.equal(Object.hasOwn(user, "password"), false);
  const cookie = cookieHeader(signIn);
  const verified = env.readAuthSession(request("/api/event/data", { cookie }));
  assert.equal(verified.userId, "owner");

  const incorrect = await env.login(
    request("/api/auth/login", {
      method: "POST",
      body: { email: "owner@example.test", password: "incorrect" },
    }),
  );
  assert.equal(incorrect.status, 401);
  assert.equal(incorrect.headers.has("set-cookie"), false);
});

test("Logout clears the signed HttpOnly session", async () => {
  const env = fixture();
  const cookie = signedCookie(env, "owner");
  const signOut = await env.logout(
    request("/api/auth/logout", { cookie, method: "POST", body: {} }),
  );
  assert.equal(signOut.status, 200);
  assert.match(signOut.headers.get("set-cookie"), /Max-Age=0/i);
});

test("An authenticated non-impersonated user can reach reporting write services", async () => {
  const env = fixture();
  const cookie = signedCookie(env, "owner");
  const publish = await env.dashboardApi(
    request("/api/event/dashboard?locale=en", {
      cookie,
      method: "POST",
      body: { widgets: [] },
    }),
  );
  const restore = await env.trashApi(
    request("/api/event/trash", {
      cookie,
      method: "POST",
      body: { id: "entry" },
    }),
  );
  assert.equal(publish.status, 200);
  assert.equal(restore.status, 200);
  assert.deepEqual(env.actions, [
    ["publish", "owner", "en"],
    ["restore", "owner", "th", "entry"],
  ]);
});

test("Production requires a configured signing secret and never issues an unsigned session", async (t) => {
  const env = fixture();
  const cookie = signedCookie(env, "owner");
  const originalNodeEnv = process.env.NODE_ENV;
  const originalSecret = process.env.AUTH_SESSION_SECRET;
  t.after(() => {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    process.env.AUTH_SESSION_SECRET = originalSecret;
  });

  process.env.NODE_ENV = "production";
  delete process.env.AUTH_SESSION_SECRET;
  const signIn = await env.login(
    request("/api/auth/login", {
      method: "POST",
      body: { email: "owner@example.test", password: "fixture" },
    }),
  );
  assert.equal(signIn.status, 503);
  assert.equal(signIn.headers.has("set-cookie"), false);
  assert.deepEqual(await signIn.json(), {
    error: "SESSION_UNAVAILABLE",
  });

  const view = await env.dataApi(request("/api/event/data", { cookie }));
  assert.equal(view.status, 401);
  assert.deepEqual(env.actions, []);
});
