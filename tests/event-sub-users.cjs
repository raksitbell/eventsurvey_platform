/* eslint-disable @typescript-eslint/no-require-imports -- Use the existing standalone TypeScript test harness pattern. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const compiled = new Map();
function load(relative, mocks = {}) {
  if (!compiled.has(relative)) {
    const filename = path.resolve(__dirname, "..", relative);
    const { outputText } = ts.transpileModule(
      fs.readFileSync(filename, "utf8"),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2020,
        },
      },
    );
    compiled.set(relative, new Function("require", "exports", outputText));
  }

  const exports = {};
  compiled.get(relative)((name) => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    assert.ok(name.startsWith("@/"), `Unexpected dependency ${name}`);
    return load(`src/${name.slice(2)}.ts`, mocks);
  }, exports);
  return exports;
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
        return [{ permission: "manage_sub_user" }];
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
