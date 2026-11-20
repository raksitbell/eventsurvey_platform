/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node tests load TypeScript through the local harness. */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const { loadSource } = require("./support/load-source.cjs");

function matrix(partial = {}) {
  return {
    event: "view_only",
    registrationForm: "view_only",
    surveyForm: "view_only",
    dashboard: "view_only",
    canViewSubmissions: false,
    canManageSubmissions: false,
    canExport: false,
    canViewActivity: false,
    ...partial,
  };
}

function fixture({
  ownerCanViewActivity = true,
  subCanViewActivity = false,
  includeLegacyModule = true,
  includeLegacyDescription = false,
} = {}) {
  const eventId = "event-a";
  const otherEventId = "event-b";
  const ownerId = "owner";
  const subId = "sub";
  const adminId = "admin";
  const outsiderId = "outsider";

  const collections = {
    users: [
      {
        id: ownerId,
        display_name: "Event Owner",
        email: "owner@example.com",
        status: "active",
        removed_at: null,
        system_role: "event_user",
        event_id: eventId,
        role_id: null,
        invited_by_user_id: null,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
      {
        id: subId,
        display_name: "Sub User",
        email: "sub@example.com",
        status: "active",
        removed_at: null,
        system_role: "event_user",
        event_id: eventId,
        role_id: null,
        invited_by_user_id: ownerId,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
      {
        id: outsiderId,
        display_name: "Other Event User",
        email: "other@example.com",
        status: "active",
        removed_at: null,
        system_role: "event_user",
        event_id: otherEventId,
        role_id: null,
        invited_by_user_id: null,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
      {
        id: adminId,
        display_name: "Platform Admin",
        email: "admin@example.com",
        status: "active",
        removed_at: null,
        system_role: "platform_admin",
        event_id: null,
        role_id: null,
        invited_by_user_id: null,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
    ],
    event_access: [
      {
        id: "access-owner",
        user_id: ownerId,
        event_id: eventId,
        role_name: "Event Admin",
        can_manage_sub_users: true,
        matrix: matrix({
          event: "can_edit",
          registrationForm: "can_edit",
          surveyForm: "can_edit",
          dashboard: "can_edit",
          canViewSubmissions: true,
          canManageSubmissions: true,
          canExport: true,
          canViewActivity: ownerCanViewActivity,
        }),
        deleted_at: null,
      },
      {
        id: "access-sub",
        user_id: subId,
        event_id: eventId,
        role_name: "Assistant",
        can_manage_sub_users: false,
        matrix: matrix({ canViewActivity: subCanViewActivity }),
        deleted_at: null,
      },
      {
        id: "access-outsider",
        user_id: outsiderId,
        event_id: otherEventId,
        role_name: "Other Admin",
        can_manage_sub_users: true,
        matrix: matrix({
          event: "can_edit",
          canViewActivity: true,
        }),
        deleted_at: null,
      },
    ],
    events: [
      {
        id: eventId,
        slug: "alpha",
        status: "open",
        default_locale: "th",
        deleted_at: null,
      },
      {
        id: otherEventId,
        slug: "beta",
        status: "open",
        default_locale: "th",
        deleted_at: null,
      },
    ],
    event_translations: [
      {
        id: "tr-a-th",
        event_id: eventId,
        locale_code: "th",
        title: "อีเวนต์อัลฟา",
        display_order: 1,
      },
      {
        id: "tr-a-en",
        event_id: eventId,
        locale_code: "en",
        title: "Alpha Event",
        display_order: 2,
      },
      {
        id: "tr-b-th",
        event_id: otherEventId,
        locale_code: "th",
        title: "อีเวนต์บีตา",
        display_order: 1,
      },
    ],
    platform_access: [
      {
        id: "plat-admin",
        user_id: adminId,
        matrix: {
          overview: "can_edit",
          events: "can_edit",
          users: "can_edit",
          canViewActivity: true,
          canInspection: true,
          canViewUnmaskedPii: false,
        },
        deleted_at: null,
      },
    ],
    audit_logs: [
      {
        id: "log-event-setup",
        event_id: eventId,
        actor_user_id: ownerId,
        action: "update",
        resource_type: "event_setup",
        resource_id: eventId,
        module: "event_setup",
        description_th: "บันทึกฉบับร่างอีเวนต์",
        description_en: "Saved event draft",
        description: includeLegacyDescription ? "legacy draft" : null,
        metadata: null,
        includes_unmasked_pii: false,
        occurred_at: "2026-11-19T10:00:00.000Z",
      },
      {
        id: "log-survey",
        event_id: eventId,
        actor_user_id: subId,
        action: "update",
        resource_type: "form",
        resource_id: "form-1",
        module: includeLegacyModule ? "Survey Builder" : "survey_builder",
        description_th: "แก้ไขแบบสอบถาม",
        description_en: "Updated survey form",
        description: null,
        metadata: { field: "title" },
        includes_unmasked_pii: false,
        occurred_at: "2026-11-19T09:00:00.000Z",
      },
      {
        id: "log-other-event",
        event_id: otherEventId,
        actor_user_id: outsiderId,
        action: "update",
        resource_type: "whitelist",
        resource_id: otherEventId,
        module: "event_setup",
        description_th: "อัปเดตรายชื่ออนุญาต",
        description_en: "Updated whitelist",
        description: null,
        metadata: { count: 3 },
        includes_unmasked_pii: false,
        occurred_at: "2026-11-19T08:00:00.000Z",
      },
      {
        id: "log-platform",
        event_id: null,
        actor_user_id: adminId,
        action: "update",
        resource_type: "platform_user",
        resource_id: ownerId,
        module: "user_management",
        description_th: "แก้ไขสิทธิ์แพลตฟอร์ม",
        description_en: "Updated platform access",
        description: null,
        metadata: {
          before: { canViewActivity: false },
          after: { canViewActivity: true },
        },
        includes_unmasked_pii: false,
        occurred_at: "2026-11-19T07:00:00.000Z",
      },
      {
        id: "log-perms",
        event_id: eventId,
        actor_user_id: ownerId,
        action: "update",
        resource_type: "event_access",
        resource_id: subId,
        module: "user_management",
        description_th: "แก้ไขสิทธิ์ผู้ใช้ย่อย",
        description_en: "Updated sub-user permissions",
        description: null,
        metadata: {
          before: { registrationForm: "can_edit" },
          after: { registrationForm: "view_only" },
        },
        includes_unmasked_pii: false,
        occurred_at: "2026-11-18T12:00:00.000Z",
      },
    ],
  };

  class MockApiError extends Error {
    constructor(status) {
      super("Fixture request failed");
      this.status = status;
    }
  }

  function lookup(resourcePath) {
    const url = new URL(resourcePath, "https://fixture.example.test");
    const [, collection, id] = url.pathname.split("/");
    const rows = collections[collection];
    if (!rows) throw new MockApiError(404);
    if (id) {
      const row = rows.find(
        (candidate) => candidate.id === decodeURIComponent(id),
      );
      if (!row) throw new MockApiError(404);
      return row;
    }
    const filters = [...url.searchParams].filter(
      ([name]) => !name.startsWith("_"),
    );
    return rows.filter((row) =>
      filters.every(([key, value]) => String(row[key]) === value),
    );
  }

  const posted = [];
  const load = loadSource({
    "@/core/api/mock-client": {
      MockApiError,
      mockApi: {
        async get(path) {
          return lookup(path);
        },
        async post(path, body) {
          const url = new URL(path, "https://fixture.example.test");
          const collection = url.pathname.split("/").filter(Boolean)[0];
          if (!collections[collection]) throw new MockApiError(404);
          collections[collection].push(body);
          posted.push({ path, body });
          return body;
        },
      },
      invalidateMockApiGetCache() {},
    },
  });

  return {
    ids: { eventId, otherEventId, ownerId, subId, adminId, outsiderId },
    collections,
    posted,
    normalizeAuditModuleKey: load("src/core/audit/module-path.ts")
      .normalizeAuditModuleKey,
    resolveActivityModulePath: load("src/core/audit/module-path.ts")
      .resolveActivityModulePath,
    writeAuditLog: load("src/core/audit/write.ts").writeAuditLog,
    matchesActivitySearch: load(
      "src/components/admin/activity/activity-format.ts",
    ).matchesActivitySearch,
    formatMetadata: load("src/components/admin/activity/activity-format.ts")
      .formatMetadata,
    translateActivityModule: load(
      "src/components/admin/activity/activity-format.ts",
    ).translateActivityModule,
    listAdminActivity: load("src/services/admin/activity.ts").listAdminActivity,
    getAdminUserActivity: load("src/services/admin/activity.ts")
      .getAdminUserActivity,
    listEventActivity: load("src/services/event/activity.ts").listEventActivity,
    getEventUserActivity: load("src/services/event/activity.ts")
      .getEventUserActivity,
    getEventAccessForUser: load("src/core/mock/access.ts").getEventAccessForUser,
    hasPlatformPermission: load("src/core/mock/access.ts")
      .hasPlatformPermission,
    ReportingError: load("src/services/event/reporting.ts").ReportingError,
  };
}

test("module path normalizes legacy labels and resolves portal routes", () => {
  const env = fixture();
  const cases = [
    ["Survey Builder", "survey_builder", "/event/form/survey"],
    ["event setup", "event_setup", "/event/details"],
    ["user_management", "user_management", "/event/team"],
    ["registration_builder", "registration_builder", "/event/form/registration"],
    ["dashboard", "dashboard", "/event/dashboard"],
  ];

  for (const [raw, key, path] of cases) {
    const normalized = env.normalizeAuditModuleKey(raw);
    const resolved = env.resolveActivityModulePath(raw, { hasEvent: true });
    assert.equal(normalized, key);
    assert.equal(resolved, path);
  }

  assert.equal(
    env.resolveActivityModulePath("user_management", { hasEvent: false }),
    "/admin/users",
  );
  assert.equal(
    env.resolveActivityModulePath("event_management", { hasEvent: false }),
    "/admin/events",
  );
});

test("activity search matches actor, translated module, and formatted metadata", () => {
  const env = fixture();
  const t = (key, values) => {
    if (key === "modules.survey_builder") return "Survey Builder";
    if (key === "meta.field") return `Field: ${values.value}`;
    if (key === "meta.fields.registrationForm") return "Registration Form";
    if (key === "meta.levels.can_edit") return "Can edit";
    if (key === "meta.levels.view_only") return "View only";
    if (key === "meta.change") {
      return `${values.field}: ${values.from} → ${values.to}`;
    }
    return key;
  };

  const item = {
    actorName: "Sub User",
    eventName: "Alpha Event",
    module: "survey_builder",
    description: "Updated survey form",
    metadata: { field: "title" },
  };

  const options = {
    translateModule: (key) => env.translateActivityModule(key, (path) => t(path)),
    formatMeta: (metadata) => env.formatMetadata(metadata, t),
    platformLabel: "Platform",
  };

  const hits = [
    "sub user",
    "survey builder",
    "title",
    "updated survey",
    "alpha",
  ];
  for (const query of hits) {
    const ok = env.matchesActivitySearch(item, query, options);
    assert.equal(ok, true, `expected hit for ${query}`);
  }
  assert.equal(env.matchesActivitySearch(item, "whitelist", options), false);

  const formatted = env.formatMetadata(
    {
      before: { registrationForm: "can_edit" },
      after: { registrationForm: "view_only" },
    },
    t,
  );
  assert.match(formatted, /Registration Form/);
  assert.match(formatted, /Can edit/);
  assert.match(formatted, /View only/);
});

test("writeAuditLog stores bilingual description fields", async () => {
  const env = fixture();
  await env.writeAuditLog({
    actorUserId: env.ids.ownerId,
    eventId: env.ids.eventId,
    action: "update",
    resourceType: "event_setup",
    resourceId: env.ids.eventId,
    module: "event_setup",
    descriptionTh: "ทดสอบไทย",
    descriptionEn: "Test English",
    metadata: { field: "title" },
  });

  const body = env.posted.at(-1)?.body;
  assert.equal(body.description_th, "ทดสอบไทย");
  assert.equal(body.description_en, "Test English");
  assert.equal(body.module, "event_setup");
  assert.equal(body.event_id, env.ids.eventId);
  assert.equal(body.description, undefined);
});

test("older audit descriptions remain readable in both locales", async () => {
  const env = fixture();
  const row = env.collections.audit_logs.find((entry) => entry.id === "log-event-setup");
  delete row.description_th;
  delete row.description_en;
  row.description = "Earlier activity description";

  for (const locale of ["th", "en"]) {
    const activity = await env.listAdminActivity(locale);
    assert.equal(activity.items.find((item) => item.id === row.id)?.description, row.description);
  }
});

test("admin activity localizes descriptions and applies filters", async () => {
  const env = fixture();

  const th = await env.listAdminActivity("th");
  const en = await env.listAdminActivity("en");

  assert.equal(
    th.items.find((row) => row.id === "log-event-setup")?.description,
    "บันทึกฉบับร่างอีเวนต์",
  );
  assert.equal(
    en.items.find((row) => row.id === "log-event-setup")?.description,
    "Saved event draft",
  );
  assert.equal(
    en.items.find((row) => row.id === "log-survey")?.module,
    "survey_builder",
  );
  assert.equal(
    en.items.find((row) => row.id === "log-event-setup")?.eventName,
    "Alpha Event",
  );

  const platformOnly = await env.listAdminActivity("en", {
    accountType: "platform",
  });
  const eventOnly = await env.listAdminActivity("en", { accountType: "event" });
  const byEvent = await env.listAdminActivity("en", {
    eventId: env.ids.eventId,
  });
  const byDate = await env.listAdminActivity("en", {
    startDate: "2026-11-19T00:00:00.000Z",
    endDate: "2026-11-19T23:59:59.999Z",
  });

  assert.equal(platformOnly.items.length, 1);
  assert.equal(platformOnly.items[0].id, "log-platform");
  assert.ok(eventOnly.items.every((row) => row.eventId));
  assert.ok(
    byEvent.items.every((row) => row.eventId === env.ids.eventId),
  );
  assert.equal(byEvent.items.length, 3);
  assert.ok(byDate.items.every((row) => row.occurredAt.startsWith("2026-11-19")));
  assert.equal(byDate.items.length, 4);
});

test("event activity requires canViewActivity and scopes to current event", async () => {
  const denied = fixture({ subCanViewActivity: false });
  await assert.rejects(
    () => denied.listEventActivity(denied.ids.subId, "en"),
    (error) => {
      return error.status === 403;
    },
  );

  const allowed = fixture({ subCanViewActivity: true });
  const data = await allowed.listEventActivity(allowed.ids.subId, "en");
  assert.equal(data.stats.platform, 0);
  assert.ok(data.items.every((row) => row.eventId === allowed.ids.eventId));
  assert.ok(!data.items.some((row) => row.id === "log-other-event"));
  assert.ok(!data.items.some((row) => row.id === "log-platform"));

  const owner = fixture({ ownerCanViewActivity: false });
  // Owner still has can_manage_sub_users → DEFAULT_ADMIN_MATRIX forces activity on.
  const ownerAccess = await owner.getEventAccessForUser(
    owner.ids.ownerId,
    owner.ids.eventId,
  );
  assert.equal(ownerAccess.matrix.canViewActivity, true);
  const ownerData = await owner.listEventActivity(owner.ids.ownerId, "en");
  assert.ok(ownerData.items.length > 0);

  const inspected = fixture();
  const inspectedData = await inspected.listEventActivity(
    inspected.ids.adminId,
    "en",
    {},
    { inspectedEventId: inspected.ids.eventId },
  );
  assert.ok(
    inspectedData.items.every((row) => row.eventId === inspected.ids.eventId),
  );
});

test("event user profile stays scoped and rejects unrelated users", async () => {
  const env = fixture({ subCanViewActivity: true });

  // Cross-event membership on the same actor — event profile must not leak it.
  env.collections.event_access.push({
    id: "access-owner-other",
    user_id: env.ids.ownerId,
    event_id: env.ids.otherEventId,
    role_name: "Guest Admin",
    can_manage_sub_users: false,
    matrix: matrix({
      event: "view_only",
      canViewActivity: true,
    }),
    deleted_at: null,
  });

  const profile = await env.getEventUserActivity(
    env.ids.subId,
    env.ids.ownerId,
    "en",
  );
  assert.ok(profile);
  assert.ok(profile.items.every((row) => row.eventId === env.ids.eventId));
  assert.ok(!profile.items.some((row) => row.id === "log-other-event"));
  assert.deepEqual(
    profile.memberships.map((row) => row.id).sort(),
    [env.ids.eventId],
    "event profile must not leak memberships from other events",
  );

  await assert.rejects(
    () =>
      env.getEventUserActivity(env.ids.subId, env.ids.outsiderId, "en"),
    (error) => {
      return error.status === 403;
    },
  );
});

test("platform activity permission flag is honored for admins", async () => {
  const env = fixture();
  const allowed = await env.hasPlatformPermission(
    env.ids.adminId,
    "view_platform_activity",
  );
  const denied = await env.hasPlatformPermission(
    env.ids.ownerId,
    "view_platform_activity",
  );
  assert.equal(allowed, true);
  assert.equal(denied, false);
});
