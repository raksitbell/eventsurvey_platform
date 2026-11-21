/* eslint-disable @typescript-eslint/no-require-imports -- Test-only CommonJS TypeScript loader. */
/* Run with node --test tests/analytics.cjs. No API writes or network access. */
process.env.MOCK_API_GET_CACHE_TTL_MS = "0";
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
const {
  getAnalytics,
  saveAnalyticsLayout,
} = require("../src/services/event/analytics.ts");
const { csvReport, printReport } = require("../src/core/analytics/report.ts");
const { parseFilters } = require("../src/core/analytics/policy.ts");
const { loadSource } = require("./support/load-source.cjs");
const reportLabels = {
  en: require("../src/messages/en.json").eventReports.analyticsExport,
  th: require("../src/messages/th.json").eventReports.analyticsExport,
};
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
        event_id: "event",
        role_id: null,
        status: "active",
        removed_at: null,
      },
      {
        id: "sub",
        system_role: "event_user",
        event_id: "event",
        role_id: null,
        status: "active",
        removed_at: null,
      },
    ],
    event_access: [
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
        id: "access-sub",
        user_id: "sub",
        event_id: "event",
        role_name: "Staff",
        can_manage_sub_users: false,
        matrix: {
          event: "view_only",
          registrationForm: "can_edit",
          surveyForm: "restricted",
          dashboard: "can_edit",
          canViewSubmissions: true,
          canManageSubmissions: false,
          canExport: false,
        },
        deleted_at: null,
      },
    ],
    events: [
      {
        id: "event",
        slug: "test",
        status: "open",
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
        type: "multiple_choice",
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
        status: "cancelled",
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
function request(user = "owner", params = "", effective = user, inspectedEventId = null) {
  if (inspectedEventId) {
    return {
      request: {
        nextUrl: new URL(
          "http://localhost/api/event/analytics?locale=en&" + params,
        ),
      },
      session: {
        realUserId: user,
        userId: user,
        role: "super_admin",
        realRole: "super_admin",
        impersonating: false,
        inspectedEventId,
        expiresAt: Date.now() + 60000,
      },
    };
  }
  const role = effective === "sub" ? "sub_user" : "event_owner";
  return {
    request: {
      nextUrl: new URL(
        "http://localhost/api/event/analytics?locale=en&" + params,
      ),
    },
    session: {
      realUserId: user,
      userId: effective,
      role,
      realRole: user === "admin" ? "super_admin" : role,
      impersonating: user !== effective,
      inspectedEventId: null,
      expiresAt: Date.now() + 60000,
    },
  };
}

function loadAnalytics(...args) {
  const { request: nextRequest, session } = request(...args);
  return getAnalytics(nextRequest, session);
}
test("analytics scope, privacy, reports, grants and layout", async () => {
  db = fixture();
  const data = await loadAnalytics();
  assert.equal(data.rows.length, 2);
  assert.equal(data.metrics.registrations, 1);
  assert.equal(data.widgets[0].value, 1);
  assert.equal(data.rows.find((r) => r.id === "r1").values.name, "••••");
  assert.equal(data.rows.find((r) => r.id === "r1").values.topic, "Technology");
  assert.ok(!JSON.stringify(data).includes("PRIVATE"));
  assert.equal(db.audit_logs.length, 1);
  assert.ok(!JSON.stringify(db.audit_logs).includes("PRIVATE"));
  const filtered = await loadAnalytics(
    "owner",
    "formId=reg&from=2026-10-25&to=2026-10-25",
  );
  assert.equal(filtered.rows.length, 1);
  assert.equal(filtered.metrics.total, 1);
  assert.equal(filtered.fields.length, 2);
  assert.equal((await loadAnalytics("owner", "to=2026-10-24")).rows.length, 0);
  await assert.rejects(
    loadAnalytics("owner", "raw=true"),
    (e) => e.status === 403,
  );
  assert.ok(!csvReport(data, reportLabels.en).includes("PRIVATE"));
  assert.equal(db.audit_logs.at(-1).includes_unmasked_pii, false);
  assert.ok(
    printReport(data, reportLabels.en).includes("Personal data masked"),
  );
  assert.ok(!printReport(data, reportLabels.en).includes("PRIVATE"));
  for (const params of ["eventId=foreign", "formId=other"])
    await assert.rejects(
      loadAnalytics("owner", params),
      (e) => e.status === 403,
    );
  await assert.rejects(
    loadAnalytics("sub", "raw=true"),
    (e) => e.status === 403,
  );
  await assert.rejects(
    loadAnalytics("admin", "raw=true", "admin", "event"),
    (e) => e.status === 403,
  );
  const inspected = await loadAnalytics("admin", "", "admin", "event");
  assert.equal(
    inspected.rows.find((row) => row.id === "r1").values.name,
    "••••",
  );
  assert.equal(inspected.permissions.manage, true);
  assert.equal(db.audit_logs.at(-1).actor_user_id, "admin");
  assert.equal(db.audit_logs.at(-1).metadata.effectiveUserId, "admin");
  assert.equal(db.audit_logs.at(-1).description_en, "Viewed event analytics");
  assert.equal(db.audit_logs.at(-1).description, undefined);
  const restricted = await loadAnalytics("sub");
  assert.deepEqual(
    restricted.forms.map((f) => f.id),
    ["reg"],
  );
  assert.equal(restricted.rows.length, 1);
  failAudit = true;
  await assert.rejects(loadAnalytics());
  failAudit = false;
  const edit = request();
  edit.request.json = async () => ({
    id: "layout",
    columns: 3,
    widgets: [{ id: "widget", title_th: "New", title_en: "New" }],
  });
  await saveAnalyticsLayout(edit.request, edit.session);
  assert.equal(db.dashboard_data[0].layout_json.columns, 3);
  const newWidget = {
    ...db.dashboard_widgets[0],
    id: "12345678-1234-1234-1234-123456789012",
  };
  edit.request.json = async () => ({
    id: "layout",
    columns: 2,
    widgets: [...db.dashboard_widgets, newWidget],
  });
  await saveAnalyticsLayout(edit.request, edit.session);
  assert.equal(db.dashboard_widgets.length, 2);
  const piiWidget = { ...newWidget, field_id: "name", form_id: "reg" };
  edit.request.json = async () => ({
    id: "layout",
    columns: 2,
    widgets: [piiWidget],
  });
  await assert.rejects(
    saveAnalyticsLayout(edit.request, edit.session),
    (e) => e.status === 403,
  );
  edit.request.json = async () => ({ id: "layout", columns: 2, widgets: [] });
  await saveAnalyticsLayout(edit.request, edit.session);
  assert.equal(db.dashboard_widgets.length, 0);
  db.event_access.find((row) => row.user_id === "sub").matrix.dashboard =
    "view_only";
  const denied = request("sub");
  denied.request.json = edit.request.json;
  await assert.rejects(
    saveAnalyticsLayout(denied.request, denied.session),
    (e) => e.status === 403,
  );
  for (const date of ["2026-02-30", "2026-99-99", "junk"])
    assert.throws(
      () => parseFilters(new URLSearchParams({ from: date })),
      (e) => e.status === 400,
    );
  assert.throws(
    () => parseFilters(new URLSearchParams("from=2026-10-26&to=2026-10-25")),
    (e) => e.status === 400,
  );
});

test("analytics honors submission visibility separately from dashboard editing", async () => {
  db = fixture();
  const access = db.event_access.find((item) => item.user_id === "sub");
  access.matrix = {
    event: "view_only",
    registrationForm: "can_edit",
    surveyForm: "restricted",
    dashboard: "can_edit",
    canViewSubmissions: false,
    canManageSubmissions: false,
    canExport: true,
  };
  const data = await loadAnalytics("sub");
  assert.equal(data.permissions.manage, true);
  assert.deepEqual(data.forms.map((form) => form.id), ["reg"]);
  // Submissions exist in the store but stay hidden without canViewSubmissions.
  assert.equal(db.form_submissions.length > 0, true);
  assert.deepEqual(data.rows, []);
  assert.equal(data.metrics.total, 0);
  const exportRequest = request("sub");
  for (const view of [false, true]) {
    for (const allowExport of [false, true]) {
      access.matrix.canViewSubmissions = view;
      access.matrix.canExport = allowExport;
      assert.deepEqual((await loadAnalytics("sub")).rows.map((row) => row.id), view ? ["r1"] : []);
      const exported = getAnalytics(exportRequest.request, exportRequest.session, "analytics.export.csv");
      if (allowExport) {
        const report = await exported;
        assert.deepEqual(report.rows.map((row) => row.id), ["r1"]);
        assert.equal(report.rows[0].values.name, "••••");
      } else {
        await assert.rejects(exported, { status: 403 });
      }
    }
  }

});

test("analytics export uses validated locales and escapes report values", async () => {
  db = fixture();
  db.field_option_translations[0].label = "=SUM(1,2)";
  db.event_translations.push({
    event_id: "event",
    locale_code: "th",
    title: "<script>unsafe</script>",
  });
  const { session } = request();
  const translatedLocales = [];
  const load = loadSource({
    "@/core/auth/api-guard": {
      async requireEventSession() {
        return session;
      },
      isAuthSession(value) {
        return value === session;
      },
    },
    "next-intl/server": {
      async getTranslations({ locale, namespace }) {
        assert.equal(namespace, "eventReports.analyticsExport");
        assert.ok(Object.hasOwn(reportLabels, locale));
        translatedLocales.push(locale);
        return (key) => {
          const label = reportLabels[locale][key];
          assert.equal(typeof label, "string", key);
          return label;
        };
      },
    },
  });
  const { POST } = load("src/app/api/event/analytics/export/route.ts");
  const exportReport = (params) =>
    POST({
      nextUrl: new URL(`http://localhost/api/event/analytics/export?${params}`),
    });

  const csv = await exportReport("format=csv&locale=en");
  assert.equal(csv.status, 200);
  const english = await csv.json();
  assert.match(english.content, /^\uFEFF"Response ID","Form","Submitted at"/);
  assert.ok(english.content.includes('"\'=SUM(1,2)"'));
  assert.ok(!english.content.includes("PRIVATE"));
  assert.equal(english.filename, "responses-en-masked.csv");

  const pdf = await exportReport("format=pdf");
  assert.equal(pdf.status, 200);
  const thai = await pdf.json();
  assert.match(thai.content, /<html lang="th">/);
  assert.ok(thai.content.includes(reportLabels.th.print));
  assert.ok(thai.content.includes(reportLabels.th.masked));
  assert.ok(thai.content.includes(reportLabels.th.responseId));
  assert.ok(thai.content.includes("&lt;script&gt;unsafe&lt;/script&gt;"));
  assert.ok(!thai.content.includes("<script>unsafe</script>"));
  assert.equal(thai.filename, "responses-th-masked.html");

  const empty = await exportReport("format=pdf&locale=th&to=2026-10-24");
  assert.equal(empty.status, 200);
  assert.ok((await empty.json()).content.includes(reportLabels.th.empty));

  const invalid = await exportReport("format=csv&locale=fr");
  assert.equal(invalid.status, 400);
  assert.deepEqual(await invalid.json(), { error: "INVALID_LOCALE" });
  assert.deepEqual(translatedLocales, ["en", "th", "th"]);
});
