/* eslint-disable @typescript-eslint/no-require-imports -- Node's test fixture uses standalone CommonJS. */
const assert = require("node:assert/strict");

const origin = "https://data.example.test";
const password = "fixture-password-1";
const timestamp = "2026-01-15T00:00:00.000Z";

function user(id, attributes) {
  return {
    id,
    display_name: `Fixture ${id} Person`,
    email: `${id.toLowerCase()}@example.test`,
    password,
    status: "active",
    system_role: "event_user",
    event_id: null,
    role_id: null,
    platform_role_id: null,
    invited_by_user_id: null,
    created_at: timestamp,
    updated_at: timestamp,
    removed_at: null,
    ...attributes,
  };
}

function setupMockData(t, { eventWrites = false } = {}) {
  const admin = user("LimitedAdmin", {
    system_role: "platform_admin",
    platform_role_id: "limited-role",
  });
  const reviewer = user("PrivacyReviewer", {
    system_role: "platform_admin",
    platform_role_id: "pii-role",
  });
  const owner = user("EventOwner", { event_id: "event-a", role_id: "owner-role" });
  const assistant = user("Assistant", {
    event_id: "event-a",
    role_id: "assistant-role",
    invited_by_user_id: owner.id,
  });
  const otherOwner = user("OtherOwner", { event_id: "event-b", role_id: "owner-role" });
  const assignable = user("Assignable", {
    id: "65f045de-1f66-4bb4-af3c-651de7f113a2",
    display_name: null,
  });
  const invited = user("InvitedUser", { status: "invited" });
  const collections = {
    users: [admin, reviewer, owner, assistant, otherOwner, assignable, invited],
    events: [
      { id: "event-a", slug: "fixture-event-a", default_locale: "en", status: "open", updated_at: timestamp },
      { id: "event-b", slug: "fixture-event-b", default_locale: "en", status: "open", updated_at: timestamp },
    ],
    event_translations: [],
    event_banners: [],
    event_form_settings: [],
    roles: [],
    role_permissions: [
      { role_id: "owner-role", permission: "manage_sub_user" },
      { role_id: "owner-role", permission: "manage_registration_form" },
    ],
    platform_role_permissions: [
      { platform_role_id: "limited-role", permission: "impersonate_event_user" },
      { platform_role_id: "pii-role", permission: "view_unmasked_pii" },
    ],
  };
  const calls = [];
  const failures = new Map();
  const unexpected = [];
  t.after(() => assert.deepEqual(unexpected, []));

  t.mock.method(globalThis, "fetch", async (input, options) => {
    const url = new URL(input);
    const method = options?.method ?? "GET";
    calls.push({ method, url });
    const [, collection, id, extra] = url.pathname.split("/");
    if (url.origin !== origin || extra || !Object.hasOwn(collections, collection)) {
      unexpected.push(`${method} ${url}`);
      throw new Error("Unexpected upstream request");
    }
    const body = options?.body ? JSON.parse(options.body) : undefined;
    const failure = failures.get(method + " " + url.pathname) ?? failures.get(url.pathname);
    const message = typeof failure === "function" ? failure(body) : failure;
    if (message) return new Response(message, { status: 500 });

    const rows = collections[collection];
    if (id) {
      const row = rows.find((item) => item.id === decodeURIComponent(id));
      if (!row) return new Response(null, { status: 404 });
      if (method === "GET") return Response.json(row);
      if (method === "PATCH" && collection === "users") {
        Object.assign(row, body);
        return Response.json(row);
      }
      if (eventWrites && method === "DELETE") {
        rows.splice(rows.indexOf(row), 1);
        return Response.json(row);
      }
    }
    if (method === "GET" && !id) {
      const filters = [...url.searchParams].filter(([field]) => !field.startsWith("_"));
      return Response.json(rows.filter((row) =>
        filters.every(([field, value]) => String(row[field]) === value)));
    }
    if (eventWrites && method === "POST" && !id) {
      rows.push(body);
      return Response.json(body, { status: 201 });
    }
    unexpected.push(`${method} ${url}`);
    throw new Error("Unexpected upstream method");
  });

  return {
    admin, reviewer, owner, assistant, otherOwner, assignable, invited,
    platformPermissions: collections.platform_role_permissions,
    calls, failures, collections,
  };
}

module.exports = { origin, password, setupMockData };
