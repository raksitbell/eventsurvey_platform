/* eslint-disable @typescript-eslint/no-require-imports -- Isolated CommonJS harness transpiles TypeScript without adding dependencies. */
// Run with node tests/event-reporting.cjs. Uses isolated in-memory API fixtures.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");
const resolve = Module._resolveFilename;
Module._resolveFilename = function (name, ...args) {
  return resolve.call(
    this,
    name.startsWith("@/") ? path.join(root, "src", name.slice(2)) : name,
    ...args,
  );
};
require.extensions[".ts"] = (mod, filename) =>
  mod._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText,
    filename,
  );
const now = new Date().toISOString();
const user = {
  id: "owner",
  event_id: "event-a",
  system_role: "event_user",
  event_role: "event_admin",
  status: "active",
  removed_at: null,
  can_view_unmasked_pii: false,
  can_manage_dashboard: true,
  can_manage_survey_form: true,
};
let db;
function reset() {
  db = {
    users: [
      user,
      {
        ...user,
        id: "viewer",
        event_role: "event_sub_user",
        can_manage_dashboard: false,
        can_manage_survey_form: false,
      },
    ],
    events: [
      { id: "event-a", slug: "event-a", status: "published", deleted_at: null },
    ],
    event_translations: [
      { id: "et", event_id: "event-a", locale_code: "th", title: "กิจกรรม" },
      { id: "ee", event_id: "event-a", locale_code: "en", title: "Event" },
    ],
    roles: [],
    forms: [
      {
        id: "form-a",
        event_id: "event-a",
        type: "survey",
        status: "published",
        deleted_at: null,
      },
      {
        id: "form-b",
        event_id: "event-b",
        type: "survey",
        status: "published",
        deleted_at: null,
      },
      {
        id: "deleted-form",
        event_id: "event-a",
        type: "survey",
        status: "published",
        deleted_at: now,
      },
    ],
    form_translations: [
      { form_id: "form-a", locale_code: "th", title: "แบบสำรวจ" },
      { form_id: "form-a", locale_code: "en", title: "Survey" },
    ],
    form_fields: [
      {
        id: "name",
        form_id: "form-a",
        type: "short_text",
        contains_pii: true,
        is_required: true,
        deleted_at: null,
      },
      {
        id: "rating",
        form_id: "form-a",
        type: "rating",
        contains_pii: false,
        is_required: true,
        deleted_at: null,
      },
    ],
    field_translations: [
      { field_id: "name", locale_code: "en", label: "Name" },
      { field_id: "rating", locale_code: "en", label: "Rating" },
    ],
    form_submissions: [
      {
        id: "response-a",
        form_id: "form-a",
        status: "submitted",
        submitted_at: now,
        deleted_at: null,
      },
      {
        id: "response-b",
        form_id: "form-b",
        status: "submitted",
        submitted_at: now,
        deleted_at: null,
      },
      {
        id: "deleted-response",
        form_id: "form-a",
        status: "soft_deleted",
        submitted_at: now,
        deleted_at: now,
      },
    ],
    submission_answers: [
      {
        id: "answer-name",
        submission_id: "response-a",
        field_id: "name",
        value_text: "PRIVATE NAME",
        value_number: null,
        value_boolean: null,
        value_date: null,
        value_time: null,
      },
      {
        id: "answer-rating",
        submission_id: "response-a",
        field_id: "rating",
        value_text: null,
        value_number: 0,
        value_boolean: null,
        value_date: null,
        value_time: null,
      },
    ],
    answer_option_selections: [],
    field_option_translations: [],
    dashboard_layouts: [{ id: "layout-a", event_id: "event-a" }],
    dashboard_widgets: [],
    trash_items: [
      {
        id: "trash-form",
        event_id: "event-a",
        resource_type: "form",
        resource_id: "deleted-form",
        display_name: "Deleted form",
        deleted_by_user_id: "owner",
        deleted_at: now,
        restored_at: null,
        restore_allowed: true,
      },
      {
        id: "trash-response",
        event_id: "event-a",
        resource_type: "submission",
        resource_id: "deleted-response",
        display_name: "PRIVATE NAME",
        deleted_by_user_id: "owner",
        deleted_at: now,
        restored_at: null,
        restore_allowed: false,
      },
    ],
  };
}
global.fetch = async (url, init = {}) => {
  const parsed = new URL(url);
  const [resource, id] = parsed.pathname.slice(1).split("/");
  const records = db[resource];
  if (!records) return new Response("", { status: 404 });
  const method = init.method ?? "GET";
  let result;
  if (method === "GET")
    result = id
      ? records.find((r) => r.id === id)
      : records.filter((r) =>
          [...parsed.searchParams].every(([k, v]) => String(r[k]) === v),
        );
  if (method === "POST") {
    result = JSON.parse(init.body);
    records.push(result);
  }
  if (method === "PATCH") {
    result = records.find((r) => r.id === id);
    if (result) Object.assign(result, JSON.parse(init.body));
  }
  if (method === "DELETE") {
    db[resource] = records.filter((r) => r.id !== id);
    result = {};
  }
  return new Response(JSON.stringify(result ?? {}), {
    status: result ? 200 : 404,
    headers: { "Content-Type": "application/json" },
  });
};
(async () => {
  reset();
  const {
    getReportingData,
    restoreTrash,
  } = require("../src/services/event/reporting.ts");
  const { publishDashboard } = require("../src/services/event/dashboard.ts");
  const { responseCsv } = require("../src/core/event/export.ts");
  const { widgetData } = require("../src/core/event/widget-data.ts");
  let data = await getReportingData("owner", "en");
  assert.equal(data.eventName, "Event");
  assert.equal(data.forms[0].title, "Survey");
  assert.equal(data.responses.length, 1);
  assert.equal(data.responses[0].respondent, "••••");
  assert.equal(data.responses[0].score, 0);
  assert.equal(data.responses[0].complete, true);
  assert(!JSON.stringify(data).includes("PRIVATE NAME"));
  assert.equal(
    (await getReportingData("owner", "th")).forms[0].title,
    "แบบสำรวจ",
  );
  assert.equal(
    data.trash.find((t) => t.id === "trash-response").canRestore,
    false,
  );
  await assert.rejects(
    () => restoreTrash("owner", "en", "trash-response"),
    (e) => e.status === 403,
  );
  await assert.rejects(
    () => restoreTrash("viewer", "en", "trash-form"),
    (e) => e.status === 403,
  );
  db.trash_items[0].deleted_at = "2020-01-01T00:00:00Z";
  await assert.rejects(
    () => restoreTrash("owner", "en", "trash-form"),
    (e) => e.status === 403,
  );
  db.trash_items[0].deleted_at = now;
  await restoreTrash("owner", "en", "trash-form");
  assert.equal(db.forms.find((f) => f.id === "deleted-form").deleted_at, null);
  assert(db.trash_items[0].restored_at);
  const widget = {
    id: "new-widget",
    widget_type: "number",
    title: "Count",
    source_form_id: "form-a",
    source_field_id: null,
    aggregation: "count",
    chart_type: null,
    comparison_mode: null,
    target_value: null,
    grid_span: 6,
    date_range_days: 0,
  };
  await assert.rejects(
    () => publishDashboard("viewer", "en", [widget]),
    (e) => e.status === 403,
  );
  await assert.rejects(
    () =>
      publishDashboard("owner", "en", [
        { ...widget, source_form_id: "form-b" },
      ]),
    (e) => e.status === 400,
  );
  await assert.rejects(
    () =>
      publishDashboard("owner", "en", [{ ...widget, source_field_id: "name" }]),
    (e) => e.status === 400,
  );
  data = await publishDashboard("owner", "en", [widget]);
  assert.equal(data.widgets.length, 1);
  assert.notEqual(data.widgets[0].id, "new-widget");
  assert.equal(widgetData(data.widgets[0], data).value, 1);
  const rating = {
    ...data.widgets[0],
    source_field_id: "rating",
    aggregation: "average",
  };
  assert.equal(widgetData(rating, data).value, 0);
  const csv = responseCsv(
    [
      {
        ...data.responses[0],
        respondent: '=HYPERLINK("bad")',
        answers: [
          { fieldId: "a", label: "ไทย", value: 'line 1\nline 2, "quoted"' },
        ],
      },
    ],
    ["ID", "Name", "Date"],
  );
  assert(csv.startsWith("\uFEFF"));
  assert(csv.includes("\"'=HYPERLINK"));
  assert(csv.includes('"line 1\nline 2, ""quoted"""'));
  data = await publishDashboard("owner", "en", []);
  assert.equal(data.widgets.length, 0);
  reset();
  const { bindMockUserAccess } = require("../src/services/auth/access.ts");
  const current = { ...db.users[0], role_id: "role-a" };
  delete current.event_role;
  delete current.can_manage_dashboard;
  delete current.can_manage_survey_form;
  delete current.can_view_unmasked_pii;
  db.users[0] = current;
  db.roles = [
    {
      id: "role-a",
      event_id: "event-a",
      owner_user_id: "owner",
      deleted_at: null,
    },
  ];
  db.role_permissions = [
    { role_id: "role-a", permission: "manage_dashboard" },
    { role_id: "role-a", permission: "manage_survey_form" },
  ];
  const bound = await bindMockUserAccess(current);
  assert.equal(bound.event_role, "event_admin");
  assert.equal(bound.can_manage_dashboard, true);
  assert.equal(bound.can_view_unmasked_pii, false);
  assert.equal((await getReportingData("owner", "en")).responses.length, 1);
  db.roles[0].event_id = "event-b";
  await assert.rejects(() => getReportingData("owner", "en"));
  console.log(
    "Passed: event isolation, TH/EN binding, PII masking, zero ratings, deleted-response exclusion, restore permissions/expiry, dashboard permissions/source validation/persistence, aggregations, CSV escaping/formula protection.",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
