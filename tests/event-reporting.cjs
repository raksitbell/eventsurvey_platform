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
  display_name: "Private Owner",
  event_id: "event-a",
  system_role: "event_user",
  role_id: "role-owner",
  status: "active",
  removed_at: null,
};
let db;
let failWidgetTitle;
function reset() {
  db = {
    users: [
      user,
      {
        ...user,
        id: "viewer",
        role_id: "role-viewer",
      },
    ],
    events: [
      {
        id: "event-a",
        slug: "event-a",
        status: "scheduled",
        start_at: "2026-10-24T18:00:00Z",
        end_at: "2026-10-25T20:00:00Z",
        default_locale: "th",
        deleted_at: null,
      },
    ],
    event_translations: [
      { id: "et", event_id: "event-a", locale_code: "th", title: "กิจกรรม" },
      { id: "ee", event_id: "event-a", locale_code: "en", title: "Event" },
    ],
    roles: [
      { id: "role-owner", event_id: "event-a", deleted_at: null },
      { id: "role-viewer", event_id: "event-a", deleted_at: null },
    ],
    role_permissions: [
      { role_id: "role-owner", permission: "manage_dashboard" },
      { role_id: "role-owner", permission: "manage_survey_form" },
      { role_id: "role-owner", permission: "view_unmasked_pii" },
    ],
    forms: [
      {
        id: "form-a",
        event_id: "event-a",
        type: "survey",
        status: "open",
        deleted_at: null,
      },
      {
        id: "form-b",
        event_id: "event-b",
        type: "survey",
        status: "open",
        deleted_at: null,
      },
      {
        id: "deleted-form",
        event_id: "event-a",
        type: "survey",
        status: "open",
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

        is_required: true,
        deleted_at: null,
      },
      {
        id: "rating",
        form_id: "form-a",
        type: "rating",

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
        status: "cancelled",
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
    field_options: [],
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
    if (resource === "dashboard_widgets" && result.title === failWidgetTitle) {
      return new Response("Simulated write error", { status: 500 });
    }
    if (records.some((record) => record.id === result.id)) {
      return new Response("Duplicate ID", { status: 409 });
    }
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
  const {
    widgetData,
    reportingDay,
  } = require("../src/core/event/widget-data.ts");
  let data = await getReportingData("owner", "en");
  assert.equal(data.eventName, "Event");
  assert.equal(data.eventStartsAt, "2026-10-24T18:00:00Z");
  assert.equal(reportingDay(data.eventStartsAt), "2026-10-25");
  assert.equal(data.forms[0].title, "Survey");
  assert.equal(data.responses.length, 1);
  assert.equal(data.responses[0].respondent, "••••");
  assert.equal(data.responses[0].score, 0);
  assert.equal(data.responses[0].complete, true);
  assert(!JSON.stringify(data).includes("PRIVATE NAME"));
  assert(!JSON.stringify(data).includes("Private Owner"));
  assert.equal(data.trash[0].deletedBy, "P••• O•••");
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
  await assert.rejects(
    () => publishDashboard("owner", "en", [{ ...widget, row_span: 99 }]),
    (e) => e.status === 400,
  );
  await assert.rejects(
    () =>
      publishDashboard("owner", "en", [{ ...widget, text_align: "invalid" }]),
    (e) => e.status === 400,
  );
  const todayStr = reportingDay(now);
  data = await publishDashboard("owner", "en", [
    {
      ...widget,
      grid_span: 2,
      row_span: 2,
      text_align: "center",
      date_from: todayStr,
      date_to: todayStr,
    },
  ]);
  assert.equal(data.widgets.length, 1);
  assert.notEqual(data.widgets[0].id, "new-widget");
  assert.equal(data.widgets[0].grid_span, 2);
  assert.equal(data.widgets[0].row_span, 2);
  assert.equal(data.widgets[0].text_align, "center");
  assert.equal(data.widgets[0].date_from, todayStr);
  assert.equal(data.widgets[0].date_to, todayStr);
  assert.equal(widgetData(data.widgets[0], data).value, 1);
  assert.equal(
    widgetData({ ...data.widgets[0], date_from: "2099-01-01" }, data).value,
    0,
  );
  const rating = {
    ...data.widgets[0],
    source_field_id: "rating",
    aggregation: "average",
  };
  assert.equal(widgetData(rating, data).value, 0);
  const asRow = (id, submittedAt, formId = "form-a") => ({
    id,
    formId,
    submittedAt,
    answers: [],
  });
  const historicalData = {
    ...data,
    eventStartsAt: "2026-10-07T17:00:00Z",
    eventEndsAt: "2026-10-14T16:59:59Z",
    responses: [
      asRow("previous-first", "2026-09-30T17:00:00Z"),
      asRow("current-first", "2026-10-07T17:00:00Z"),
      asRow("current-last", "2026-10-14T16:59:59Z"),
      asRow("next-day", "2026-10-14T17:00:00Z"),
      asRow("other-form", "2026-10-07T17:00:00Z", "form-b"),
    ],
  };
  const previousPeriod = {
    ...widget,
    widget_type: "comparison",
    comparison_mode: "previous_period",
  };
  const fixedNow = Date.parse("2026-11-19T00:00:00Z");
  const historical = widgetData(
    { ...previousPeriod, date_from: "2026-10-08", date_to: "2026-10-14" },
    historicalData,
    fixedNow,
  );
  assert.equal(historical.value, 2);
  assert.equal(historical.comparison, 100);
  assert.deepEqual(
    widgetData(previousPeriod, historicalData, fixedNow),
    historical,
  );
  for (const date_range_days of [NaN, Infinity, "legacy", "7", 3]) {
    assert.deepEqual(
      widgetData({ ...previousPeriod, date_range_days }, historicalData, fixedNow),
      historical,
    );
  }

  const rolling = widgetData(
    { ...previousPeriod, date_range_days: 7 },
    {
      ...data,
      responses: [
        asRow("previous-as-of-time", "2026-11-01T17:15:00Z"),
        asRow("day-before-start", "2026-11-02T16:59:59Z"),
        asRow("rolling-start", "2026-11-02T17:00:00Z"),
        asRow("as-of-now", "2026-11-08T17:15:00Z"),
        asRow("future-same-day", "2026-11-08T17:16:00Z"),
      ],
    },
    Date.parse("2026-11-08T17:15:00Z"),
  );
  assert.deepEqual(rolling.dateRange, { from: "2026-11-03", to: "2026-11-09" });
  assert.equal(rolling.value, 2);
  assert.equal(rolling.comparison, 100);

  const priorDb = db;
  db = structuredClone(db);
  db.form_fields.push(
    { id: "choices", form_id: "form-a", type: "multiple_choice" },
    {
      id: "private-choices",
      form_id: "form-a",
      type: "multiple_choice",
      contains_pii: true,
    },
  );
  db.field_options.push(
    { id: "option-a", field_id: "choices" },
    { id: "option-b", field_id: "choices" },
    { id: "private-option", field_id: "private-choices" },
  );
  db.field_option_translations.push(
    { option_id: "option-a", locale_code: "en", label: "Alpha, extended" },
    { option_id: "option-b", locale_code: "en", label: "Beta" },
    { option_id: "private-option", locale_code: "en", label: "Sensitive option" },
  );
  db.form_submissions.push({
    id: "response-c",
    form_id: "form-a",
    status: "submitted",
    submitted_at: now,
  });
  db.submission_answers.push(
    { id: "choice-a", submission_id: "response-a", field_id: "choices" },
    { id: "choice-c", submission_id: "response-c", field_id: "choices" },
    {
      id: "private-choice",
      submission_id: "response-a",
      field_id: "private-choices",
    },
  );
  db.answer_option_selections.push(
    { answer_id: "choice-a", option_id: "option-a" },
    { answer_id: "choice-a", option_id: "option-b" },
    { answer_id: "choice-a", option_id: "option-a" },
    { answer_id: "choice-c", option_id: "option-a" },
    { answer_id: "private-choice", option_id: "private-option" },
  );
  const choiceData = await getReportingData("owner", "en");
  db = priorDb;
  const choices = choiceData.responses
    .find((row) => row.id === "response-a")
    .answers.find((answer) => answer.fieldId === "choices");
  assert.equal(choices.value, "Alpha, extended, Beta");
  assert.deepEqual(choices.selectedOptions, [
    { id: "option-a", label: "Alpha, extended" },
    { id: "option-b", label: "Beta" },
  ]);
  assert(!JSON.stringify(choiceData).includes("Sensitive option"));
  assert(!JSON.stringify(choiceData).includes("private-option"));
  const chart = widgetData(
    {
      ...widget,
      widget_type: "chart",
      source_field_id: "choices",
      date_from: todayStr,
      date_to: todayStr,
    },
    choiceData,
  );
  assert.deepEqual(chart.groups, [["Alpha, extended", 2], ["Beta", 1]]);

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
  db.dashboard_widgets.push({
    ...widget,
    id: "legacy",
    layout_id: "layout-a",
    display_order: 0,
    grid_span: undefined,
    row_span: undefined,
    date_range_days: undefined,
    display_size: "medium",
    date_type: "week",
  });
  data = await getReportingData("owner", "en");
  assert.equal(data.widgets[0].grid_span, 2);
  assert.equal(data.widgets[0].date_range_days, 7);

  const revisions = [
    { ...widget, id: "one", title: "First widget" },
    { ...widget, id: "two", title: "Second widget" },
  ];
  failWidgetTitle = "Second widget";
  await assert.rejects(() => publishDashboard("owner", "en", revisions));
  assert.deepEqual(
    (await getReportingData("owner", "en")).widgets.map((row) => row.id),
    ["legacy"],
  );
  failWidgetTitle = undefined;

  const published = await publishDashboard("owner", "en", revisions);
  const storedCount = db.dashboard_widgets.length;
  const retried = await publishDashboard("owner", "en", revisions);
  assert.deepEqual(retried.widgets, published.widgets);
  assert.equal(db.dashboard_widgets.length, storedCount);
  assert.deepEqual(
    retried.widgets.map((row) => row.title),
    ["First widget", "Second widget"],
  );

  db.events[0].status = "draft";
  await assert.rejects(
    () => getReportingData("owner", "en"),
    (e) => e.status === 403,
  );
  db.events[0].status = "closed";
  assert.equal((await getReportingData("owner", "en")).responses.length, 1);
  db.roles[0].event_id = "event-b";
  await assert.rejects(
    () => getReportingData("owner", "en"),
    (e) => e.status === 403,
  );
  db.roles[0].event_id = "event-a";
  db.role_permissions = db.role_permissions.filter(
    (row) => row.permission !== "manage_survey_form",
  );
  const restricted = await getReportingData("owner", "en");
  assert.deepEqual(restricted.responses, []);
  assert.deepEqual(restricted.forms, []);
  assert.deepEqual(restricted.widgets, []);
  assert.equal(restricted.canManage, false);
  await assert.rejects(
    () => publishDashboard("owner", "en", []),
    (error) => error.status === 403,
  );
  reset();
  db.roles[0].description = JSON.stringify({
    event: "view_only",
    surveyForm: "can_edit",
    dashboard: "can_edit",
    canViewSubmissions: false,
    canExport: true,
  });
  delete db.form_submissions;
  delete db.submission_answers;
  const dashboardOnly = await getReportingData("owner", "en");
  assert.equal(dashboardOnly.canManage, true);
  assert.equal(dashboardOnly.canViewSubmissions, false);
  assert.equal(dashboardOnly.canExport, false);
  assert.deepEqual(dashboardOnly.forms.map((form) => form.id), ["form-a"]);
  assert.deepEqual(dashboardOnly.responses, []);
  assert.ok(dashboardOnly.trash.every((row) => row.type === "form"));

  reset();
  delete db.trash_items;
  db.form_submissions.push({
    id: "invalid-date",
    form_id: "form-a",
    status: "submitted",
    submitted_at: "invalid",
  });
  assert.equal((await getReportingData("owner", "en")).responses.length, 1);
  const derivedTrash = (await getReportingData("owner", "en")).trash;
  assert.deepEqual(derivedTrash.map((row) => [row.name, row.canRestore]), [
    ["deleted-form", true],
  ]);
  console.log(
    "Passed: event isolation, TH/EN binding, PII masking, zero ratings, deleted-response exclusion, restore permissions/expiry, dashboard permissions/source validation/persistence, aggregations, CSV escaping/formula protection.",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
