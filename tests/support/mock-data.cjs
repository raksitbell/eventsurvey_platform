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
    platform_role_id: null,
  });
  const reviewer = user("PrivacyReviewer", {
    system_role: "platform_admin",
    platform_role_id: null,
  });
  const owner = user("EventOwner", { event_id: "event-a", role_id: null });
  const assistant = user("Assistant", {
    event_id: "event-a",
    role_id: null,
    invited_by_user_id: owner.id,
  });
  const otherOwner = user("OtherOwner", { event_id: "event-b", role_id: null });
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
    event_access: [
      {
        id: "access-owner",
        user_id: owner.id,
        event_id: "event-a",
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
        created_at: timestamp,
        updated_at: timestamp,
        deleted_at: null,
      },
      {
        id: "access-assistant",
        user_id: assistant.id,
        event_id: "event-a",
        role_name: "Staff",
        can_manage_sub_users: false,
        matrix: {
          event: "view_only",
          registrationForm: "view_only",
          surveyForm: "view_only",
          dashboard: "view_only",
          canViewSubmissions: false,
          canManageSubmissions: false,
          canExport: false,
        },
        created_at: timestamp,
        updated_at: timestamp,
        deleted_at: null,
      },
      {
        id: "access-other-owner",
        user_id: otherOwner.id,
        event_id: "event-b",
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
        created_at: timestamp,
        updated_at: timestamp,
        deleted_at: null,
      },
    ],
    platform_access: [
      {
        id: "plat-limited",
        user_id: admin.id,
        matrix: {
          overview: "can_edit",
          events: "can_edit",
          users: "can_edit",
          canViewActivity: true,
          canInspection: true,
          canViewUnmaskedPii: false,
        },
        created_at: timestamp,
        updated_at: timestamp,
        deleted_at: null,
      },
      {
        id: "plat-pii",
        user_id: reviewer.id,
        matrix: {
          overview: "view_only",
          events: "view_only",
          users: "view_only",
          canViewActivity: false,
          canInspection: false,
          canViewUnmaskedPii: true,
        },
        created_at: timestamp,
        updated_at: timestamp,
        deleted_at: null,
      },
    ],
    forms: [],
    // Fire-and-forget audit writes must not fail primary flows in fixtures.
    audit_logs: [],
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
      if (method === "PATCH" && (eventWrites || collection === "users")) {
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
    // Allow audit POSTs even when the fixture is otherwise read-only.
    if ((eventWrites || collection === "audit_logs") && method === "POST" && !id) {
      if (body.id && rows.some((row) => row.id === body.id)) return new Response(null, { status: 409 });
      rows.push(body);
      return Response.json(body, { status: 201 });
    }
    unexpected.push(`${method} ${url}`);
    throw new Error("Unexpected upstream method");
  });

  return {
    admin, reviewer, owner, assistant, otherOwner, assignable, invited,
    platformPermissions: collections.platform_access,
    calls, failures, collections,
  };
}

module.exports = { origin, password, setupMockData };
