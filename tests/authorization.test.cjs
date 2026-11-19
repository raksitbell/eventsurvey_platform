/* eslint-disable @typescript-eslint/no-require-imports -- Node's standalone test runner loads compiled TypeScript. */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const { NextRequest, NextResponse } = require("next/server");
const { loadSource } = require("./support/load-source.cjs");

process.env.AUTH_SESSION_SECRET = "session-secret-only-for-offline-tests";

const load = loadSource({
  "next-intl/middleware": () => () => {
    const response = NextResponse.next();
    response.headers.set("x-test-intl", "forwarded");
    return response;
  },
});
const permissions = load("src/core/auth/permissions.ts");
const proxy = load("src/proxy.ts").default;
const { AUTH_SESSION_COOKIE, setAuthSessionCookie } = load("src/core/auth/cookie.ts");

const roleTable = [
  { role: "super_admin", home: "/admin", admin: true, event: false },
  { role: "event_owner", home: "/event", admin: false, event: true },
  { role: "sub_user", home: "/event", admin: false, event: true },
  { role: "participant", home: "/login", admin: false, event: false },
  { role: "unknown", home: "/login", admin: false, event: false },
];

test("permissions resolve the portal capabilities and default destination of each role", () => {
  for (const { role, home, admin, event } of roleTable) {
    assert.equal(permissions.getHomePathForRole(role), home, role);
    assert.equal(permissions.canAccessAdmin(role), admin, role);
    assert.equal(permissions.canAccessEvent(role), event, role);
    assert.equal(permissions.canAccessPortal(role), admin || event, role);
    assert.equal(permissions.canImpersonate(role), admin, role);
    assert.equal(permissions.isImpersonatableRole(role), event, role);
    assert.equal(permissions.canEnterAdminArea(role, false), admin, role);
    assert.equal(permissions.canEnterEventArea(role, role, false), event, role);
  }
  assert.equal(permissions.canEnterAdminArea(undefined, false), false);
  assert.equal(permissions.canEnterEventArea(undefined, undefined, false), false);
  assert.equal(permissions.canEnterAdminArea("super_admin", true), false);
  assert.equal(permissions.canEnterEventArea("event_owner", "super_admin", false), false);
  assert.equal(permissions.canEnterEventArea("event_owner", "super_admin", true), true);
});

test("User projection masks all three PII fields and always strips passwords", () => {
  const { projectUserPii } = load("src/core/auth/pii.ts");
  const authorized = {
    name: "Fixture Person",
    email: "fixture@example.test",
    phone: "+1 202 555 0123",
  };
  const user = { ...authorized, password: "fixture-password" };
  const masked = projectUserPii(user, false);
  for (const key of ["name", "email", "phone"]) {
    assert.notEqual(masked[key], authorized[key]);
    assert.notEqual(masked[key], "");
  }
  assert.equal("password" in masked, false);
  assert.deepEqual(projectUserPii(user, true), authorized);
  assert.deepEqual(projectUserPii({ ...user, phone: null }, false), { ...masked, phone: null });
});

function sessionCookie(role, realRole = role) {
  const response = NextResponse.next();
  const impersonating = role !== realRole;
  setAuthSessionCookie(response, {
    realUserId: "real-account",
    userId: impersonating ? "effective-account" : "real-account",
    realRole,
    role,
    impersonating,
  });
  return response.cookies.get(AUTH_SESSION_COOKIE).value;
}

function navigate(path, cookie) {
  const headers = cookie ? { cookie: `${AUTH_SESSION_COOKIE}=${cookie}` } : undefined;
  return proxy(new NextRequest(`https://portal.example.test${path}`, { headers }));
}

test("proxy routes the full auth-state matrix before forwarding to localization", async (t) => {
  const cases = [
    { name: "signed out", admin: "/login", event: "/login" },
    { name: "invalid session", cookie: "invalid", admin: "/login", event: "/login" },
    { name: "super admin", cookie: sessionCookie("super_admin"), admin: null, event: "/error/403", login: "/admin" },
    { name: "event owner", cookie: sessionCookie("event_owner"), admin: "/error/403", event: null, login: "/event" },
    { name: "sub-user", cookie: sessionCookie("sub_user"), admin: "/error/403", event: null, login: "/event" },
    { name: "impersonating", cookie: sessionCookie("event_owner", "super_admin"), admin: "/error/403", event: null, login: "/event" },
  ];

  for (const { name, cookie, admin, event, login = null } of cases) {
    await t.test(name, () => {
      const destinations = [
        ["/login", login],
        ["/admin", admin],
        ["/admin/activity", admin],
        ["/admin/users", admin],
        ["/event", event],
        ["/event/activity", event],
        ["/event/forms", event],
      ];
      for (const [path, target] of destinations) {
        const response = navigate(path, cookie);
        const location = response.headers.get("location");
        assert.equal(location ? new URL(location).pathname : null, target, path);
        assert.equal(response.headers.has("x-test-intl"), target === null, path);
      }
    });
  }
});

test("proxy forwards unrelated paths with similar prefixes to the localized router", () => {
  for (const path of ["/events", "/administrator", "/eventual"]) {
    const response = navigate(path);
    assert.equal(response.headers.get("location"), null, path);
    assert.equal(response.headers.get("x-test-intl"), "forwarded", path);
  }
});
