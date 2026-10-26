/* eslint-disable @typescript-eslint/no-require-imports -- Test-only CommonJS TypeScript loader. */
/* Run with node --test tests/analytics.cjs. No API writes or network access. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"),
  path = require("node:path"),
  Module = require("node:module"),
  ts = require("typescript");
const original = Module._resolveFilename;
Module._resolveFilename = function (name, ...args) {
  return original.call(
    this,
    name.startsWith("@/")
      ? path.join(__dirname, "../src", name.slice(2))
      : name,
    ...args,
  );
};
require.extensions[".ts"] = (module, filename) =>
  module._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText,
    filename,
  );
process.env.AUTH_SESSION_SECRET = "test-only-key-do-not-use-for-deployment";
const {
  getAnalytics,
  saveAnalyticsLayout,
} = require("../src/services/event/analytics.ts");
const {
  issueVerifiedSession,
} = require("../src/core/auth/verified-session.ts");
const { csvReport, printReport } = require("../src/core/analytics/report.ts");
const {
  parseFilters,
  hasRawGrant,
} = require("../src/core/analytics/policy.ts");
function fixture() {
  return {
    users: [
      {
        id: "admin",
        system_role: "platform_admin",
        status: "active",
        removed_at: null,
      },
      {
        id: "owner",
        system_role: "event_user",
        event_role: "event_admin",
        event_id: "event",
        role_id: "role",
        status: "active",
        removed_at: null,
        can_manage_dashboard: true,
        can_view_unmasked_pii: true,
        permission_granted_by_user_id: "admin",
        permission_updated_at: "2026-10-01",
      },
      {
        id: "sub",
        system_role: "event_user",
        event_role: "event_sub_user",
        event_id: "event",
        role_id: "role",
        status: "active",
        removed_at: null,
        can_manage_dashboard: false,
        can_view_unmasked_pii: true,
        permission_granted_by_user_id: "admin",
        permission_updated_at: "2026-10-01",
      },
    ],
    roles: [{ id: "role", event_id: "event" }],
    permissions: ["dashboards", "registrations", "surveys"].map((feature) => ({
      role_id: "role",
      feature,
      can_access: true,
      can_view: true,
      can_edit: true,
    })),
    events: [
      {
        id: "event",
        slug: "test",
        timezone: "Asia/Bangkok",
        default_locale: "th",
        deleted_at: null,
      },
    ],
    event_translations: [
      { event_id: "event", locale_code: "en", title: "Test event" },
    ],
    forms: [
      { id: "reg", event_id: "event", type: "registration", deleted_at: null },
      { id: "survey", event_id: "event", type: "survey", deleted_at: null },
      { id: "other", event_id: "foreign", type: "survey", deleted_at: null },
    ],
    form_translations: [],
    form_fields: [
      {
        id: "name",
        form_id: "reg",
        type: "short_text",
        contains_pii: true,
        display_order: 1,
        deleted_at: null,
      },
      {
        id: "score",
        form_id: "survey",
        type: "number",
        contains_pii: false,
        display_order: 1,
        deleted_at: null,
      },
      {
        id: "topic",
        form_id: "reg",
        type: "checkbox",
        contains_pii: false,
        display_order: 2,
        deleted_at: null,
      },
    ],
    field_translations: [],
    field_options: [{ id: "opt", field_id: "topic", deleted_at: null }],
    field_option_translations: [
      { option_id: "opt", locale_code: "en", label: "Technology" },
    ],
    form_submissions: [
      {
        id: "r1",
        form_id: "reg",
        status: "submitted",
        submitted_at: "2026-10-24T18:00:00Z",
        deleted_at: null,
      },
      {
        id: "r2",
        form_id: "survey",
        status: "submitted",
        submitted_at: "2026-10-25T10:00:00Z",
        deleted_at: null,
      },
      {
        id: "deleted",
        form_id: "reg",
        status: "soft_deleted",
        submitted_at: "2026-10-25T10:00:00Z",
        deleted_at: "2026-10-25",
      },
    ],
    submission_answers: [
      {
        id: "a1",
        submission_id: "r1",
        field_id: "name",
        value_text: "=PRIVATE()",
        value_number: null,
      },
      { id: "a2", submission_id: "r2", field_id: "score", value_number: 5 },
      { id: "a3", submission_id: "r1", field_id: "topic" },
    ],
    answer_option_selections: [{ answer_id: "a3", option_id: "opt" }],
    dashboard_data: [
      {
        id: "layout",
        event_id: "event",
        title_th: "Test",
        title_en: "Test",
        is_visible: true,
        layout_json: { columns: 2 },
        display_order: 1,
      },
    ],
    dashboard_widgets: [
      {
        id: "widget",
        dashboard_data_id: "layout",
        type: "kpi",
        form_id: "reg",
        field_id: null,
        config_json: { metric: "submission_count" },
        display_order: 1,
        title_th: "Count",
        title_en: "Count",
      },
    ],
    audit_logs: [],
  };
}
let db,
  failAudit = false;
global.fetch = async (url, init = {}) => {
  const u = new URL(url),
    [collection, id] = u.pathname.slice(1).split("/");
  assert.ok(collection in db, `Unexpected collection ${collection}`);
  if (init.method === "POST") {
    if (failAudit && collection === "audit_logs")
      return new Response("{}", { status: 500 });
    const body = JSON.parse(init.body);
    db[collection].push(body);
    return Response.json(body);
  }
  if (init.method === "PATCH") {
    const item = db[collection].find((x) => x.id === id);
    Object.assign(item, JSON.parse(init.body));
    return Response.json(item);
  }
  if (init.method === "DELETE") {
    db[collection] = db[collection].filter((x) => x.id !== id);
    return Response.json({});
  }
  const value = id
    ? db[collection].find((x) => x.id === id)
    : db[collection].filter((x) =>
        [...u.searchParams].every(([k, v]) => String(x[k]) === v),
      );
  return value ? Response.json(value) : new Response("{}", { status: 404 });
};
function request(user = "owner", params = "", effective = user) {
  let token;
  issueVerifiedSession(
    {
      cookies: {
        set: (_name, value) => {
          token = value;
        },
      },
    },
    user,
  );
  const hint = encodeURIComponent(
    JSON.stringify({
      userId: effective,
      role: "event_owner",
      realRole: user === "admin" ? "super_admin" : "event_owner",
      impersonating: user !== effective,
    }),
  );
  return {
    nextUrl: new URL(
      "http://localhost/api/event/analytics?locale=en&" + params,
    ),
    cookies: {
      get: (name) => ({
        value: name === "eventsurvey_verified_session" ? token : hint,
      }),
    },
  };
}
test("analytics scope, privacy, reports, grants and layout", async () => {
  db = fixture();
  const data = await getAnalytics(request());
  assert.equal(data.rows.length, 2);
  assert.equal(data.metrics.registrations, 1);
  assert.equal(data.widgets[0].value, 1);
  assert.equal(data.rows.find((r) => r.id === "r1").values.name, "••••");
  assert.equal(data.rows.find((r) => r.id === "r1").values.topic, "Technology");
  assert.ok(!JSON.stringify(data).includes("PRIVATE"));
  assert.equal(db.audit_logs.length, 1);
  assert.ok(!JSON.stringify(db.audit_logs).includes("PRIVATE"));
  const filtered = await getAnalytics(
    request("owner", "formId=reg&from=2026-10-25&to=2026-10-25"),
  );
  assert.equal(filtered.rows.length, 1);
  assert.equal(filtered.metrics.total, 1);
  assert.equal(filtered.fields.length, 2);
  assert.equal(
    (await getAnalytics(request("owner", "to=2026-10-24"))).rows.length,
    0,
  );
  const raw = await getAnalytics(request("owner", "raw=true"));
  assert.equal(raw.rows.find((r) => r.id === "r1").values.name, "=PRIVATE()");
  assert.match(csvReport(raw), /'=PRIVATE/);
  assert.ok(db.audit_logs.at(-1).includes_unmasked_pii);
  assert.ok(printReport(data).includes("Personal data masked"));
  assert.ok(!printReport(data).includes("PRIVATE"));
  for (const params of ["eventId=foreign", "formId=other"])
    await assert.rejects(
      getAnalytics(request("owner", params)),
      (e) => e.status === 403,
    );
  await assert.rejects(
    getAnalytics(request("sub", "raw=true")),
    (e) => e.status === 403,
  );
  await assert.rejects(
    getAnalytics(request("admin", "raw=true", "owner")),
    (e) => e.status === 403,
  );
  await assert.rejects(
    getAnalytics(request("sub", "", "owner")),
    (e) => e.status === 403,
  );
  db.users[1].permission_granted_by_user_id = "sub";
  await assert.rejects(
    getAnalytics(request("owner", "raw=true")),
    (e) => e.status === 403,
  );
  db.users[1].permission_granted_by_user_id = "admin";
  const tampered = request();
  const get = tampered.cookies.get;
  tampered.cookies.get = (name) =>
    name === "eventsurvey_verified_session"
      ? { value: "fake.fake" }
      : get(name);
  await assert.rejects(getAnalytics(tampered), (e) => e.status === 401);
  db.permissions.find((p) => p.feature === "surveys").can_view = false;
  const restricted = await getAnalytics(request("sub"));
  assert.deepEqual(
    restricted.forms.map((f) => f.id),
    ["reg"],
  );
  assert.equal(restricted.rows.length, 1);
  failAudit = true;
  await assert.rejects(getAnalytics(request()));
  failAudit = false;
  const edit = request();
  edit.json = async () => ({
    id: "layout",
    columns: 3,
    widgets: [{ id: "widget", title_th: "New", title_en: "New" }],
  });
  await saveAnalyticsLayout(edit);
  assert.equal(db.dashboard_data[0].layout_json.columns, 3);
  const newWidget = {
    ...db.dashboard_widgets[0],
    id: "12345678-1234-1234-1234-123456789012",
  };
  edit.json = async () => ({
    id: "layout",
    columns: 2,
    widgets: [...db.dashboard_widgets, newWidget],
  });
  await saveAnalyticsLayout(edit);
  assert.equal(db.dashboard_widgets.length, 2);
  const piiWidget = { ...newWidget, field_id: "name", form_id: "reg" };
  edit.json = async () => ({ id: "layout", columns: 2, widgets: [piiWidget] });
  await assert.rejects(saveAnalyticsLayout(edit), (e) => e.status === 403);
  edit.json = async () => ({ id: "layout", columns: 2, widgets: [] });
  await saveAnalyticsLayout(edit);
  assert.equal(db.dashboard_widgets.length, 0);
  const denied = request("sub");
  denied.json = edit.json;
  await assert.rejects(saveAnalyticsLayout(denied), (e) => e.status === 403);
  for (const date of ["2026-02-30", "2026-99-99", "junk"])
    assert.throws(
      () => parseFilters(new URLSearchParams({ from: date })),
      (e) => e.status === 400,
    );
  assert.throws(
    () => parseFilters(new URLSearchParams("from=2026-10-26&to=2026-10-25")),
    (e) => e.status === 400,
  );
  assert.equal(hasRawGrant(db.users[2], db.users[0]), false);
});
