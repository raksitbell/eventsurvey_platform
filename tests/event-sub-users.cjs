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
  role_id: "owner-role",
  system_role: "event_user",
  status: "active",
  removed_at: null,
};
const assistant = {
  ...owner,
  id: "assistant",
  role_id: "assistant-role",
};

function fixture(rows) {
  const users = new Map(rows.map((row) => [row.id, { ...row }]));
  const writes = [];
  const mockApi = {
    async get(query) {
      if (query === "/role_permissions?role_id=owner-role") {
        return [{ role_id: "owner-role", permission: "manage_sub_user" }];
      }
      if (query === "/role_permissions?role_id=assistant-role") return [];
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
  return {
    remove: (target = assistant.id) =>
      service.removeSubUser("event-a", target, owner.id),
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
    ["missing manage permission", { ...owner, role_id: "assistant-role" }],
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
  const roles = new Map([
    [
      assistant.role_id,
      { id: assistant.role_id, event_id: "event-a", name: "Assistant" },
    ],
  ]);
  const permissions = new Map(
    [
      { id: "team", role_id: owner.role_id, permission: "manage_sub_user" },
      { id: "event", role_id: assistant.role_id, permission: "manage_event" },
    ].map((row) => [row.id, row]),
  );
  const writes = [];
  const mockApi = {
    async get(query) {
      if (query.startsWith("/role_permissions?role_id=")) {
        return [...permissions.values()].filter(
          (row) => row.role_id === query.split("=")[1],
        );
      }
      if (query.startsWith("/roles/")) return roles.get(query.split("/")[2]);
      if (query.startsWith("/users/")) return users.get(query.split("/")[2]);
      throw new Error(`Unexpected read ${query}`);
    },
    async post(query, row) {
      writes.push(["POST", query]);
      if (query === failure) throw new Error("Permission store unavailable");
      const rows = query === "/roles" ? roles : permissions;
      rows.set(row.id, row);
      return row;
    },
    async patch(query, patch) {
      writes.push(["PATCH", query]);
      if (query === failure) throw new Error("Account store unavailable");
      const user = Object.assign(users.get(query.split("/")[2]), patch);
      if (failure === "lost-assignment-response") {
        throw new Error("Account assignment response lost");
      }
      return user;
    },
    async delete(query) {
      writes.push(["DELETE", query]);
      const [, collection, id] = query.split("/");
      (collection === "roles" ? roles : permissions).delete(id);
    },
  };
  const loadEditing = loadSource({
    "@/core/api/mock-client": { mockApi, MockApiError },
    "@/core/mail/send-invite": {},
  });
  const { updateSubUserPermissions } = loadEditing(
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
    users,
    roles,
    permissions,
    writes,
  };
}

test("Event Admin permission edits are rejected before any writes", async () => {
  const { update, permissions, writes } = editingFixture();
  await assert.rejects(update(owner.id), { code: "FORBIDDEN", status: 403 });
  assert.equal(permissions.get("team").permission, "manage_sub_user");
  assert.deepEqual(writes, []);
});

test("assistant permission edits switch the selected user to a complete new role", async () => {
  const { update, users, roles, permissions, writes } = editingFixture();
  const updated = await update();
  assert.equal(users.get("assistant").role_id, updated.roleId);
  assert.equal(users.get("teammate").role_id, assistant.role_id);
  assert.equal(permissions.get("event").role_id, assistant.role_id);
  assert.deepEqual(updated.rawPermissions, ["manage_dashboard"]);
  assert.equal(roles.get(updated.roleId).name, "Assistant");
  assert.equal(
    JSON.parse(roles.get(updated.roleId).description).canViewSubmissions,
    false,
  );
  assert.deepEqual(writes, [
    ["POST", "/roles"],
    ["POST", "/role_permissions"],
    ["PATCH", "/users/assistant"],
  ]);
  await update();
  assert.equal(writes.length, 3);
});

test("failed permission writes or role assignment leave the previous role active", async () => {
  for (const failure of ["/role_permissions", "/users/assistant"]) {
    const { update, users, roles, permissions } = editingFixture(failure);
    await assert.rejects(update(), /store unavailable/);
    assert.equal(users.get("assistant").role_id, assistant.role_id);
    assert.deepEqual([...roles.keys()], [assistant.role_id]);
    assert.deepEqual([...permissions.keys()], ["team", "event"]);
  }
});

test("a confirmed role assignment is preserved when its response is lost", async () => {
  const { update, users, roles, permissions, writes } = editingFixture(
    "lost-assignment-response",
  );
  const updated = await update();
  assert.equal(users.get("assistant").role_id, updated.roleId);
  assert.ok(roles.has(updated.roleId));
  assert.ok(
    [...permissions.values()].some(
      (row) =>
        row.role_id === updated.roleId && row.permission === "manage_dashboard",
    ),
  );
  assert.ok(writes.every(([method]) => method !== "DELETE"));
});

test("team listing filters unscoped mock members and role rows", async () => {
  const external = {
    ...assistant,
    id: "external",
    email: "external@example.test",
    event_id: "event-b",
  };
  const { getSubUsers } = load("src/services/event/sub-users.ts", {
    "@/core/api/mock-client": {
      mockApi: {
        async get(query) {
          if (query.startsWith("/users?")) return [owner, assistant, external];
          if (query.startsWith("/roles?")) {
            return [
              { id: "owner-role", event_id: "event-a", name: "Owner" },
              { id: "assistant-role", event_id: "event-b", name: "External" },
            ];
          }
          assert.equal(query, "/role_permissions");
          return [
            { role_id: "owner-role", permission: "manage_sub_user" },
            { role_id: "assistant-role", permission: "manage_sub_user" },
          ];
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

test("team and QR routes await signed access and keep impersonated team view read-only", async (t) => {
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
    platform_role_id: "admin-role",
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
          if (query === "/role_permissions?role_id=owner-role") {
            return [{ role_id: "owner-role", permission: "manage_sub_user" }];
          }
          if (query === "/role_permissions?role_id=assistant-role") return [];
          assert.equal(
            query,
            "/platform_role_permissions?platform_role_id=admin-role",
          );
          return [
            {
              platform_role_id: "admin-role",
              permission: "impersonate_event_user",
            },
          ];
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
  function sessionFor(user, role, impersonating = false) {
    const response = new NextResponse();
    setAuthSessionCookie(response, {
      userId: user.id,
      role,
      realUserId: impersonating ? platform.id : user.id,
      realRole: impersonating ? "super_admin" : role,
      impersonating,
    });
    return response.cookies.get(AUTH_SESSION_COOKIE).value;
  }
  const eventOwner = sessionFor(owner, "event_owner");
  const eventAssistant = sessionFor(assistant, "sub_user");
  const readOnly = sessionFor(owner, "event_owner", true);
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
    ["read", owner.event_id, owner.id],
    ["share", owner.id],
    ["share", owner.id],
  ]);
});

function invitationFixture(t, { failMail = false, failPermission = false, failUserWrite } = {}) {
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
  const grants = new Map();
  const roles = new Map();
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
          if (query === "/role_permissions?role_id=owner-role") {
            return [{ role_id: "owner-role", permission: "manage_sub_user" }];
          }
          if (query.startsWith("/role_permissions?role_id=")) {
            return [...grants.values()].filter(
              (grant) => query.endsWith(grant.role_id),
            );
          }
          if (query === "/events/event-a") return { id: "event-a", slug: "test-event" };
          if (query === "/event_translations?event_id=event-a") {
            return [{ event_id: "event-a", locale_code: "en", title: "Demo Fair" }];
          }
          assert.fail(`Unexpected read ${query}`);
        },
        async post(query, row) {
          if (query === "/roles") roles.set(row.id, row);
          else if (query === "/role_permissions") {
            if (failPermission && row.permission === "manage_dashboard") {
              throw new Error("Permission write failed");
            }
            grants.set(row.id, row);
          } else if (query === "/users") {
            if (failUserWrite !== "before") users.set(row.id, row);
            if (failUserWrite) throw new Error("User write response failed");
          }
          else assert.fail(`Unexpected write ${query}`);
          return row;
        },
        async patch(query, data) {
          const user = users.get(query.slice("/users/".length));
          assert.ok(user, `Unexpected patch ${query}`);
          return Object.assign(user, data);
        },
        async delete(query) {
          const [, resource, id] = query.split("/");
          if (resource === "roles") roles.delete(id);
          else if (resource === "role_permissions") grants.delete(id);
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
    grants,
    loadInvite,
    roles,
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

test("member invitation reports delivery failures and skips account creation when role setup fails", async (t) => {
  await t.test("SMTP failure leaves the invite pending", async (t) => {
    const { invite, sent, users } = invitationFixture(t, { failMail: true });
    const member = await invite();
    assert.equal(member.inviteSent, false);
    assert.equal(users.get(member.id).status, "invited");
    assert.equal(users.get(member.id).joined_at, null);
    assert.deepEqual(sent, []);
    await assert.rejects(invite(), { code: "EMAIL_ALREADY_EXISTS", status: 409 });
  });

  await t.test("permission failure discards the staged role", async (t) => {
    const { invite, grants, roles, sent, users } = invitationFixture(t, { failPermission: true });
    await assert.rejects(invite(), /Permission write failed/);
    assert.deepEqual([...users.keys()], [owner.id]);
    assert.equal(roles.size, 0);
    assert.equal(grants.size, 0);
    assert.deepEqual(sent, []);
  });
});

test("member invitation reconciles a failed user write response before sending mail", async (t) => {
  await t.test("an uncreated account leaves no permissions behind", async (t) => {
    const { invite, grants, roles, sent, users } = invitationFixture(t, { failUserWrite: "before" });
    await assert.rejects(invite(), /User write response failed/);
    assert.deepEqual([...users.keys()], [owner.id]);
    assert.equal(roles.size, 0);
    assert.equal(grants.size, 0);
    assert.deepEqual(sent, []);
  });

  await t.test("a persisted account keeps its permissions and receives mail", async (t) => {
    const { invite, grants, roles, sent, users } = invitationFixture(t, { failUserWrite: "after" });
    const member = await invite();
    assert.equal(users.get(member.id).role_id, member.roleId);
    assert.ok(roles.has(member.roleId));
    assert.equal(grants.size, 2);
    assert.equal(member.inviteSent, true);
    assert.equal(sent.length, 1);
  });
});
