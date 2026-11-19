/* eslint-disable @typescript-eslint/no-require-imports -- Use the existing standalone TypeScript test harness pattern. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { NextRequest, NextResponse } = require("next/server");
const { loadSource } = require("./support/load-source.cjs");

function load(relative, mocks) {
  return loadSource(mocks)(relative);
}

const { MockApiError } = load("src/core/api/mock-client.ts");
const owner = {
  id: "owner",
  event_id: "event-a",
  role_id: null,
  system_role: "event_user",
  status: "active",
  removed_at: null,
};
const assistant = {
  ...owner,
  id: "assistant",
  role_id: null,
};

const ADMIN_MATRIX = {
  event: "can_edit",
  registrationForm: "can_edit",
  surveyForm: "can_edit",
  dashboard: "can_edit",
  canViewSubmissions: true,
  canManageSubmissions: true,
  canExport: true,
};
const STAFF_MATRIX = {
  event: "view_only",
  registrationForm: "view_only",
  surveyForm: "view_only",
  dashboard: "view_only",
  canViewSubmissions: false,
  canManageSubmissions: false,
  canExport: false,
};

function fixture(rows) {
  const users = new Map(rows.map((row) => [row.id, { ...row }]));
  const eventAccess = new Map([
    [
      "owner",
      {
        id: "access-owner",
        user_id: "owner",
        event_id: "event-a",
        role_name: "Event Admin",
        can_manage_sub_users: true,
        matrix: ADMIN_MATRIX,
        deleted_at: null,
      },
    ],
    [
      "assistant",
      {
        id: "access-assistant",
        user_id: "assistant",
        event_id: "event-a",
        role_name: "Staff",
        can_manage_sub_users: false,
        matrix: STAFF_MATRIX,
        deleted_at: null,
      },
    ],
  ]);
  const writes = [];
  const mockApi = {
    async get(query) {
      if (query.startsWith("/event_access?user_id=")) {
        const userId = query.split("=")[1];
        const row = eventAccess.get(userId);
        return row ? [row] : [];
      }
      assert.ok(query.startsWith("/users/"), `Unexpected read ${query}`);
      const user = users.get(query.slice("/users/".length));
      if (!user) throw new MockApiError("User not found", 404);
      return user;
    },
    async patch(query, patch) {
      writes.push({ query, patch });
      const user = users.get(query.slice("/users/".length));
      assert.ok(user, `Unexpected write ${query}`);
      Object.assign(user, patch);
    },
  };
  const service = load("src/services/event/sub-users.ts", {
    "@/core/api/mock-client": { mockApi, MockApiError },
  });
  const actorId = rows[0]?.id ?? owner.id;
  return {
    remove: (target = assistant.id) =>
      service.removeSubUser("event-a", target, actorId),
    writes,
  };
}

test("Event Admin can remove a same-event assistant once", async () => {
  const { remove, writes } = fixture([owner, assistant]);

  await remove();
  assert.equal(writes.length, 1);
  const [{ query, patch }] = writes;
  assert.equal(query, "/users/assistant");
  assert.equal(patch.status, "removed");
  assert.ok(Number.isFinite(Date.parse(patch.removed_at)));
  assert.equal(patch.updated_at, patch.removed_at);

  await remove();
  assert.equal(writes.length, 1);
});

test("removal rejects targets outside event membership without writing", async (t) => {
  const cases = [
    ["different event", { ...assistant, event_id: "event-b" }],
    ["unassigned", { ...assistant, event_id: null }],
    ["platform-only account", { ...assistant, system_role: "platform_admin" }],
  ];
  for (const [name, target] of cases) {
    await t.test(name, async () => {
      const { remove, writes } = fixture([owner, target]);
      await assert.rejects(remove(), {
        code: "USER_NOT_IN_EVENT",
        status: 400,
      });
      assert.deepEqual(writes, []);
    });
  }
});

test("removal handles missing and previously removed accounts without writing", async () => {
  const missing = fixture([owner]);
  await assert.rejects(missing.remove(), {
    code: "USER_NOT_FOUND",
    status: 404,
  });
  assert.deepEqual(missing.writes, []);

  const removed = fixture([
    owner,
    { ...assistant, removed_at: "2026-11-01T00:00:00.000Z" },
  ]);
  await removed.remove();
  assert.deepEqual(removed.writes, []);
});

test("removal requires a current same-event Event Admin and prevents self-removal", async (t) => {
  const cases = [
    [
      "missing manage permission",
      {
        ...owner,
        id: "no-manage",
      },
    ],
    ["different event", { ...owner, event_id: "event-b" }],
    ["removed admin", { ...owner, status: "removed" }],
  ];
  for (const [name, actor] of cases) {
    await t.test(name, async () => {
      const { remove, writes } = fixture([actor, assistant]);
      await assert.rejects(remove(), { code: "FORBIDDEN", status: 403 });
      assert.deepEqual(writes, []);
    });
  }

  const { remove, writes } = fixture([owner, assistant]);
  await assert.rejects(remove(owner.id), {
    code: "CANNOT_REMOVE_SELF",
    status: 400,
  });
  assert.deepEqual(writes, []);
});

function editingFixture(failure = null) {
  const teammate = { ...assistant, id: "teammate" };
  const users = new Map(
    [owner, assistant, teammate].map((user) => [user.id, { ...user }]),
  );
  const eventAccess = new Map([
    [
      "access-owner",
      {
        id: "access-owner",
        user_id: "owner",
        event_id: "event-a",
        role_name: "Event Admin",
        can_manage_sub_users: true,
        matrix: ADMIN_MATRIX,
        deleted_at: null,
      },
    ],
    [
      "access-assistant",
      {
        id: "access-assistant",
        user_id: "assistant",
        event_id: "event-a",
        role_name: "Assistant",
        can_manage_sub_users: false,
        matrix: { ...STAFF_MATRIX, event: "can_edit" },
        deleted_at: null,
      },
    ],
  ]);
  const writes = [];
  const mockApi = {
    async get(query) {
      if (query.startsWith("/event_access?user_id=")) {
        const userId = decodeURIComponent(query.split("=")[1]);
        return [...eventAccess.values()].filter((row) => row.user_id === userId);
      }
      if (query.startsWith("/event_access?event_id=")) {
        return [...eventAccess.values()].filter(
          (row) => row.event_id === "event-a",
        );
      }
      if (query.startsWith("/users?")) return [...users.values()];
      if (query.startsWith("/users/")) return users.get(query.split("/")[2]);
      throw new Error(`Unexpected read ${query}`);
    },
    async post(query, row) {
      writes.push(["POST", query]);
      if (query === failure) throw new Error("Permission store unavailable");
      if (query === "/event_access") {
        eventAccess.set(row.id, row);
        return row;
      }
      throw new Error(`Unexpected post ${query}`);
    },
    async patch(query, patch) {
      writes.push(["PATCH", query]);
      if (query === failure) throw new Error("Account store unavailable");
      if (query.startsWith("/event_access/")) {
        const id = query.split("/")[2];
        const row = Object.assign(eventAccess.get(id), patch);
        return row;
      }
      const user = Object.assign(users.get(query.split("/")[2]), patch);
      return user;
    },
    async delete() {
      writes.push(["DELETE"]);
    },
  };
  const loadEditing = loadSource({
    "@/core/api/mock-client": { mockApi, MockApiError },
    "@/core/mail/send-invite": {},
  });
  const { updateSubUserPermissions, getSubUsers } = loadEditing(
    "src/services/event/sub-users.ts",
  );
  const { DEFAULT_SUB_USER_MATRIX } = loadEditing(
    "src/core/auth/event-permissions.ts",
  );
  return {
    update: (target = assistant.id) =>
      updateSubUserPermissions(
        "event-a",
        target,
        {
          permissions: {
            ...DEFAULT_SUB_USER_MATRIX,
            dashboard: "can_edit",
          },
        },
        owner.id,
      ),
    getSubUsers: () => getSubUsers("event-a", owner.id),
    DEFAULT_SUB_USER_MATRIX,
    users,
    eventAccess,
    writes,
  };
}

test("Event Admin permission edits are rejected before any writes", async () => {
  const { update, writes } = editingFixture();
  await assert.rejects(update(owner.id), { code: "FORBIDDEN", status: 403 });
  assert.deepEqual(writes, []);
});

test("assistant permission edits update event_access matrix in place", async () => {
  const { update, eventAccess, writes } = editingFixture();
  const updated = await update();
  assert.equal(updated.roleId, "access-assistant");
  assert.deepEqual(updated.rawPermissions, ["manage_dashboard"]);
  assert.equal(eventAccess.get("access-assistant").matrix.dashboard, "can_edit");
  assert.equal(eventAccess.get("access-assistant").matrix.canViewSubmissions, false);
  assert.ok(writes.some(([method, path]) => method === "PATCH" && path.includes("/event_access/")));
  assert.ok(writes.some(([method, path]) => method === "PATCH" && path.includes("/users/assistant")));
});

test("saving all view_only keeps matrix on event_access", async () => {
  const { users, eventAccess, writes, DEFAULT_SUB_USER_MATRIX } =
    editingFixture();
  const loadEditing = loadSource({
    "@/core/api/mock-client": {
      mockApi: {
        async get(query) {
          if (query.startsWith("/users?")) return [...users.values()];
          if (query.startsWith("/event_access?user_id=")) {
            const userId = decodeURIComponent(query.split("=")[1]);
            return [...eventAccess.values()].filter(
              (row) => row.user_id === userId,
            );
          }
          if (query.startsWith("/event_access?event_id=")) {
            return [...eventAccess.values()];
          }
          if (query.startsWith("/users/")) return users.get(query.split("/")[2]);
          throw new Error(`Unexpected read ${query}`);
        },
        async post(query, row) {
          writes.push(["POST", query]);
          eventAccess.set(row.id, row);
          return row;
        },
        async patch(query, patch) {
          writes.push(["PATCH", query]);
          if (query.startsWith("/event_access/")) {
            return Object.assign(eventAccess.get(query.split("/")[2]), patch);
          }
          return Object.assign(users.get(query.split("/")[2]), patch);
        },
        async delete() {},
      },
      MockApiError,
    },
    "@/core/mail/send-invite": {},
  });
  const { updateSubUserPermissions, getSubUsers } = loadEditing(
    "src/services/event/sub-users.ts",
  );

  const updated = await updateSubUserPermissions(
    "event-a",
    assistant.id,
    { permissions: { ...DEFAULT_SUB_USER_MATRIX } },
    owner.id,
  );
  assert.deepEqual(updated.rawPermissions, []);
  assert.equal(updated.permissions.event, "view_only");
  assert.equal(updated.permissions.dashboard, "view_only");
  assert.equal(
    eventAccess.get("access-assistant").matrix.registrationForm,
    "view_only",
  );

  const listed = await getSubUsers("event-a", owner.id);
  const row = listed.subUsers.find((user) => user.id === assistant.id);
  assert.ok(row);
  assert.equal(row.permissions.event, "view_only");
  assert.equal(row.permissions.registrationForm, "view_only");
  assert.equal(row.permissions.surveyForm, "view_only");
  assert.equal(row.permissions.dashboard, "view_only");
});

test("failed event_access writes leave the previous matrix active", async () => {
  const { update, eventAccess } = editingFixture("/event_access/access-assistant");
  const before = structuredClone(eventAccess.get("access-assistant").matrix);
  await assert.rejects(update(), /store unavailable/);
  assert.deepEqual(eventAccess.get("access-assistant").matrix, before);
});

test("team listing filters unscoped mock members via event_access", async () => {
  const external = {
    ...assistant,
    id: "external",
    email: "external@example.test",
    event_id: "event-b",
  };
  const eventAccess = [
    {
      id: "access-owner",
      user_id: owner.id,
      event_id: "event-a",
      role_name: "Event Admin",
      can_manage_sub_users: true,
      matrix: ADMIN_MATRIX,
      deleted_at: null,
    },
    {
      id: "access-assistant",
      user_id: assistant.id,
      event_id: "event-a",
      role_name: null,
      can_manage_sub_users: false,
      matrix: STAFF_MATRIX,
      deleted_at: null,
    },
    {
      id: "access-external",
      user_id: external.id,
      event_id: "event-b",
      role_name: "External",
      can_manage_sub_users: true,
      matrix: ADMIN_MATRIX,
      deleted_at: null,
    },
  ];
  const { getSubUsers } = load("src/services/event/sub-users.ts", {
    "@/core/api/mock-client": {
      mockApi: {
        async get(query) {
          if (query.startsWith("/users?")) return [owner, assistant, external];
          if (query.startsWith("/event_access?event_id=")) {
            const eventId = decodeURIComponent(query.split("=")[1]);
            return eventAccess.filter((row) => row.event_id === eventId);
          }
          if (query.startsWith("/event_access?user_id=")) {
            const userId = decodeURIComponent(query.split("=")[1]);
            return eventAccess.filter((row) => row.user_id === userId);
          }
          throw new Error(`Unexpected read ${query}`);
        },
      },
    },
  });
  const { canManageSubUsers, subUsers } = await getSubUsers(
    "event-a",
    owner.id,
  );
  assert.equal(canManageSubUsers, true);
  assert.deepEqual(
    subUsers.map((user) => user.id),
    [owner.id, assistant.id],
  );
  assert.equal(subUsers[1].customRoleName, null);
  assert.deepEqual(subUsers[1].rawPermissions, []);
  assert.equal(
    (await getSubUsers("event-a", assistant.id)).canManageSubUsers,
    false,
  );
});

test("team and QR routes await signed access; inspection manages, legacy impersonation stays read-only", async (t) => {
  const previousSecret = process.env.AUTH_SESSION_SECRET;
  t.after(() => {
    if (previousSecret === undefined) delete process.env.AUTH_SESSION_SECRET;
    else process.env.AUTH_SESSION_SECRET = previousSecret;
  });
  process.env.AUTH_SESSION_SECRET = "local-team-route-test-signing-secret";
  const platform = {
    id: "platform",
    system_role: "platform_admin",
    status: "active",
    platform_role_id: null,
  };
  const accounts = new Map(
    [owner, assistant, platform].map((user) => [user.id, user]),
  );
  const calls = [];
  const loadRoute = loadSource({
    "@/core/api/mock-client": {
      mockApi: {
        async get(query) {
          if (query.startsWith("/users/")) return accounts.get(query.slice(7));
          if (query.startsWith("/event_access?user_id=")) {
            const userId = decodeURIComponent(query.split("=")[1]);
            if (userId === owner.id) {
              return [
                {
                  id: "access-owner",
                  user_id: owner.id,
                  event_id: owner.event_id,
                  role_name: "Event Admin",
                  can_manage_sub_users: true,
                  matrix: ADMIN_MATRIX,
                  deleted_at: null,
                },
              ];
            }
            return [];
          }
          if (query.startsWith("/platform_access?user_id=")) {
            const userId = decodeURIComponent(query.split("=")[1]);
            if (userId === platform.id) {
              return [
                {
                  id: "platform-access",
                  user_id: platform.id,
                  matrix: {
                    overview: "can_edit",
                    events: "can_edit",
                    users: "can_edit",
                    canViewActivity: true,
                    canInspection: true,
                    canViewUnmaskedPii: true,
                  },
                  deleted_at: null,
                },
              ];
            }
            return [];
          }
          throw new Error(`Unexpected read ${query}`);
        },
      },
    },
    "@/services/event/workspace": {
      getEventWorkspace: async () => ({ eventId: owner.event_id }),
    },
    "@/services/event/sub-users": {
      async getSubUsers(eventId, userId) {
        calls.push(["read", eventId, userId]);
        return { canManageSubUsers: true, subUsers: [] };
      },
      async inviteSubUser() {
        throw new Error("upstream test detail");
      },
      async updateSubUserPermissions() {
        throw new Error("unexpected update");
      },
      async removeSubUser() {
        throw new Error("unexpected removal");
      },
    },
    "@/services/event/public-event": {
      async getAssignedShareLinks(userId) {
        calls.push(["share", userId]);
        return {
          links: { survey: "https://example.test/event/sample/survey" },
        };
      },
    },
  });
  const team = loadRoute("src/app/api/event/sub-users/route.ts");
  const member = loadRoute("src/app/api/event/sub-users/[id]/route.ts");
  const share = loadRoute("src/app/api/event/share-links/route.ts");
  const qr = loadRoute("src/app/api/event/share-links/qr/route.ts");
  const { setAuthSessionCookie, AUTH_SESSION_COOKIE } = loadRoute(
    "src/core/auth/cookie.ts",
  );
  function sessionFor(
    user,
    role,
    { impersonating = false, inspectedEventId = null } = {},
  ) {
    const response = new NextResponse();
    if (inspectedEventId) {
      setAuthSessionCookie(response, {
        userId: platform.id,
        role: "super_admin",
        realUserId: platform.id,
        realRole: "super_admin",
        impersonating: false,
        inspectedEventId,
      });
    } else {
      setAuthSessionCookie(response, {
        userId: user.id,
        role,
        realUserId: impersonating ? platform.id : user.id,
        realRole: impersonating ? "super_admin" : role,
        impersonating,
        inspectedEventId: null,
      });
    }
    return response.cookies.get(AUTH_SESSION_COOKIE).value;
  }
  const eventOwner = sessionFor(owner, "event_owner");
  const eventAssistant = sessionFor(assistant, "sub_user");
  const readOnly = sessionFor(owner, "event_owner", { impersonating: true });
  const inspecting = sessionFor(platform, "super_admin", {
    inspectedEventId: owner.event_id,
  });
  const portal = "https://portal.example.test";
  function request(pathname, cookie, method = "GET", body) {
    return new NextRequest(portal + pathname, {
      method,
      headers: {
        cookie: `${AUTH_SESSION_COOKIE}=${cookie}`,
        "content-type": "application/json",
        origin: portal,
      },
      ...(body !== undefined && { body: JSON.stringify(body) }),
    });
  }
  function assertStatus(response, status) {
    assert.equal(response.status, status);
    assert.match(response.headers.get("cache-control"), /private, no-store/);
  }

  const teamPath = "/api/event/sub-users";
  const memberPath = `${teamPath}/${assistant.id}`;
  const sharePath = "/api/event/share-links";
  const qrPath = `${sharePath}/qr?kind=survey&download=1`;
  const context = { params: Promise.resolve({ id: assistant.id }) };
  assertStatus(await team.GET(request(teamPath, "invalid")), 401);
  assertStatus(await share.GET(request(sharePath, eventAssistant)), 403);
  assertStatus(await qr.GET(request(qrPath, "invalid")), 401);
  assertStatus(await team.POST(request(teamPath, readOnly, "POST", {})), 403);
  assertStatus(
    await member.PATCH(request(memberPath, readOnly, "PATCH", {}), context),
    403,
  );
  assertStatus(
    await member.DELETE(request(memberPath, readOnly, "DELETE"), context),
    403,
  );
  assert.deepEqual(calls, []);

  const inspectRead = await team.GET(request(teamPath, inspecting));
  assertStatus(inspectRead, 200);
  assert.deepEqual(await inspectRead.json(), {
    canManageSubUsers: true,
    subUsers: [],
  });
  assertStatus(
    await team.POST(request(teamPath, inspecting, "POST", null)),
    400,
  );

  assertStatus(
    await team.POST(request(teamPath, eventOwner, "POST", null)),
    400,
  );
  assertStatus(
    await member.PATCH(
      request(memberPath, eventOwner, "PATCH", { permissions: [] }),
      context,
    ),
    400,
  );
  const failed = await team.POST(
    request(teamPath, eventOwner, "POST", {
      email: "new@example.test",
      name: "New Assistant",
      roleName: "Organizer",
      permissions: {},
    }),
  );
  assertStatus(failed, 502);
  assert.deepEqual(await failed.json(), { error: "Failed to invite sub-user" });
  const scopedRead = await team.GET(request(teamPath, readOnly));
  assertStatus(scopedRead, 200);
  assert.deepEqual(await scopedRead.json(), {
    canManageSubUsers: false,
    subUsers: [],
  });
  assertStatus(await share.GET(request(sharePath, eventOwner)), 200);
  const qrResponse = await qr.GET(request(qrPath, eventOwner));
  assertStatus(qrResponse, 200);
  assert.equal(qrResponse.headers.get("content-type"), "image/png");
  assert.match(
    qrResponse.headers.get("content-disposition"),
    /eventsurvey-survey-qr\.png/,
  );
  assert.deepEqual(calls, [
    ["read", owner.event_id, platform.id],
    ["read", owner.event_id, owner.id],
    ["share", owner.id],
    ["share", owner.id],
  ]);
});

function invitationFixture(t, { failMail = false, failAccess = false, failUserWrite } = {}) {
  const settings = {
    APP_URL: "https://portal.example.test",
    AUTH_SESSION_SECRET: "event-invitation-test-signing-secret-only",
    MAIL_HOST: "smtp.example.test",
    MAIL_PORT: "465",
    MAIL_USERNAME: "no-reply@example.test",
    MAIL_PASSWORD: "test-only-password",
    MAIL_FROM_ADDRESS: "no-reply@example.test",
  };
  for (const [key, value] of Object.entries(settings)) {
    const original = process.env[key];
    process.env[key] = value;
    t.after(() => {
      if (original === undefined) delete process.env[key];
      else process.env[key] = original;
    });
  }

  const users = new Map([[owner.id, owner]]);
  const eventAccess = new Map([
    [
      "access-owner",
      {
        id: "access-owner",
        user_id: owner.id,
        event_id: "event-a",
        role_name: "Event Admin",
        can_manage_sub_users: true,
        matrix: ADMIN_MATRIX,
        deleted_at: null,
      },
    ],
  ]);
  const sent = [];
  const loadInvite = loadSource({
    "@/core/api/mock-client": {
      MockApiError,
      mockApi: {
        async get(query) {
          if (query.startsWith("/users/")) {
            const user = users.get(query.slice("/users/".length));
            if (!user) throw new MockApiError("User not found", 404);
            return user;
          }
          if (query.startsWith("/users?")) {
            const params = new URLSearchParams(query.split("?")[1]);
            return [...users.values()].filter((user) =>
              [...params].every(([key, value]) => user[key] === value),
            );
          }
          if (query.startsWith("/event_access?user_id=")) {
            const userId = decodeURIComponent(query.split("=")[1]);
            return [...eventAccess.values()].filter(
              (row) => row.user_id === userId && !row.deleted_at,
            );
          }
          if (query === "/events/event-a") return { id: "event-a", slug: "test-event" };
          if (query === "/event_translations?event_id=event-a") {
            return [{ event_id: "event-a", locale_code: "en", title: "Demo Fair" }];
          }
          assert.fail(`Unexpected read ${query}`);
        },
        async post(query, row) {
          if (query === "/event_access") {
            if (failAccess) throw new Error("Permission write failed");
            eventAccess.set(row.id, row);
          } else if (query === "/users") {
            if (failUserWrite !== "before") users.set(row.id, row);
            if (failUserWrite) throw new Error("User write response failed");
          } else {
            assert.fail(`Unexpected write ${query}`);
          }
          return row;
        },
        async patch(query, data) {
          const user = users.get(query.slice("/users/".length));
          assert.ok(user, `Unexpected patch ${query}`);
          return Object.assign(user, data);
        },
        async delete(query) {
          const [, resource, id] = query.split("/");
          if (resource === "event_access") eventAccess.delete(id);
          else assert.fail(`Unexpected delete ${query}`);
        },
      },
    },
    nodemailer: {
      createTransport: () => ({
        async sendMail(message) {
          if (failMail) throw new Error("SMTP unavailable");
          sent.push(message);
        },
      }),
    },
  });
  const { inviteSubUser } = loadInvite("src/services/event/sub-users.ts");
  const { DEFAULT_SUB_USER_MATRIX } = loadInvite("src/core/auth/event-permissions.ts");
  const input = {
    email: " New@example.test ",
    name: "New Member",
    roleName: "Organizer",
    permissions: {
      ...DEFAULT_SUB_USER_MATRIX,
      event: "can_edit",
      dashboard: "can_edit",
    },
  };
  return {
    invite: (overrides) => inviteSubUser("event-a", { ...input, ...overrides }, owner.id),
    eventAccess,
    loadInvite,
    sent,
    users,
  };
}

test("member invitation requires signed password setup before the account can log in", async (t) => {
  const { invite, loadInvite, sent, users } = invitationFixture(t);
  const { loginWithMockCredentials } = loadInvite("src/services/auth/login.ts");
  const { setPasswordForInvitedUser } = loadInvite("src/services/auth/setup-password.ts");
  const [created, duplicate] = await Promise.allSettled([invite(), invite()]);
  assert.equal(created.status, "fulfilled");
  assert.equal(duplicate.status, "rejected");
  assert.equal(duplicate.reason.code, "EMAIL_ALREADY_EXISTS");
  const member = created.value;
  const record = users.get(member.id);

  assert.equal(member.status, "invited");
  assert.equal(member.joinedAt, null);
  assert.equal(member.inviteSent, true);
  assert.equal(member.email, "new@example.test");
  assert.equal("password" in member, false);
  assert.notEqual(record.password, "password123");
  assert.equal((await loginWithMockCredentials(member.email, record.password)).ok, false);
  assert.equal((await loginWithMockCredentials(member.email, "password123")).ok, false);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, member.email);
  assert.match(sent[0].text, /invited as an Event Team member for "Demo Fair"/);
  assert.match(sent[0].html, /an Event Team member/);
  const setupUrl = sent[0].text.match(/https:\/\/portal\.example\.test\/setup-password\/(\S+)/);
  assert.ok(setupUrl);
  const token = setupUrl[1];

  await assert.rejects(invite(), { code: "EMAIL_ALREADY_EXISTS", status: 409 });
  await assert.rejects(invite({ email: "first@example.test,another@example.test" }), {
    code: "INVALID_EMAIL",
    status: 400,
  });
  await setPasswordForInvitedUser(token, "member-chosen-password");
  assert.equal(record.status, "active");
  assert.ok(record.joined_at);
  const login = await loginWithMockCredentials(member.email, "member-chosen-password");
  assert.equal(login.ok, true);
  assert.equal(login.user.role, "sub_user");
  await assert.rejects(setPasswordForInvitedUser(token, "another-password"), {
    code: "INVITE_NOT_AVAILABLE",
    status: 410,
  });
  await assert.rejects(invite(), { code: "EMAIL_ALREADY_EXISTS", status: 409 });

  const { sendSetupPasswordInvite } = loadInvite("src/core/mail/send-invite.ts");
  await sendSetupPasswordInvite({
    to: "admin@example.test",
    displayName: "Event Admin",
    userId: owner.id,
    eventTitleEn: "Demo Fair",
  });
  assert.match(sent[1].text, /invited as Event Admin for "Demo Fair"/);
});

test("member invitation reports delivery failures and skips account creation when access setup fails", async (t) => {
  await t.test("SMTP failure leaves the invite pending", async (t) => {
    const { invite, sent, users } = invitationFixture(t, { failMail: true });
    const member = await invite();
    assert.equal(member.inviteSent, false);
    assert.equal(users.get(member.id).status, "invited");
    assert.equal(users.get(member.id).joined_at, null);
    assert.deepEqual(sent, []);
    await assert.rejects(invite(), { code: "EMAIL_ALREADY_EXISTS", status: 409 });
  });

  await t.test("access write failure discards the staged row", async (t) => {
    const { invite, eventAccess, sent, users } = invitationFixture(t, {
      failAccess: true,
    });
    await assert.rejects(invite(), /Permission write failed/);
    assert.deepEqual([...users.keys()], [owner.id]);
    assert.deepEqual([...eventAccess.keys()], ["access-owner"]);
    assert.deepEqual(sent, []);
  });
});

test("member invitation rolls back event_access when the user write fails", async (t) => {
  await t.test("an uncreated account leaves no access behind", async (t) => {
    const { invite, eventAccess, sent, users } = invitationFixture(t, {
      failUserWrite: "before",
    });
    await assert.rejects(invite(), /User write response failed/);
    assert.deepEqual([...users.keys()], [owner.id]);
    assert.deepEqual([...eventAccess.keys()], ["access-owner"]);
    assert.deepEqual(sent, []);
  });

  await t.test("a persisted user still rolls back access when the response fails", async (t) => {
    const { invite, eventAccess, sent, users } = invitationFixture(t, {
      failUserWrite: "after",
    });
    await assert.rejects(invite(), /User write response failed/);
    assert.equal(users.size, 2);
    assert.deepEqual([...eventAccess.keys()], ["access-owner"]);
    assert.deepEqual(sent, []);
  });
});
