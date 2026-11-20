/* eslint-disable @typescript-eslint/no-require-imports -- The Node test harness loads the TypeScript service. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { test } = require("node:test");
const { loadSource } = require("./support/load-source.cjs");
const { randomUUID } = require("node:crypto");

test("single-language drafts retain all option IDs and schedule only with one complete translation", async (t) => {
  const eventId = randomUUID();
  const cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), "event-form-languages-"));
  t.after(() => fs.rmSync(cacheDir, { recursive: true, force: true }));
  const rows = { events: [{ id: eventId, has_registration: true, has_survey: true }], forms: [], form_fields: [], form_translations: [], field_options: [], field_option_translations: [], field_translations: [] };
  function matching(resource) {
    const url = new URL(resource, "https://fixture.example.test");
    const [, table, id] = url.pathname.split("/");
    const filters = [...url.searchParams].filter(([name]) => !name.startsWith("_"));
    return id ? rows[table].find((row) => row.id === id) :
      rows[table].filter((row) => filters.every(([key, value]) => row[key] === value));
  }
  const load = loadSource({
    "node:os": { tmpdir: () => cacheDir },
    "@/core/audit/write": { writeAuditLog: async () => {} },
    "@/core/api/mock-client": { mockApi: {
      get: async (resource) => structuredClone(matching(resource)),
      getFresh: async (resource) => structuredClone(matching(resource)),
      post: async (resource, body) => { rows[resource.slice(1)].push(body); return body; },
      put: async (resource, body) => Object.assign(matching(resource), body),
    } },
  });
  const { createFormBodySchema } = load("src/core/validation/forms.ts");
  const { completeFormLocale } = load("src/core/forms/content.ts");
  const { createForm, updateFormStatus } = load("src/services/event/forms.ts");
  const opensAt = new Date(Date.now() + 3_600_000).toISOString();
  for (const [type, locale, other] of [["registration", "th", "en"], ["survey", "en", "th"]]) {
    const input = createFormBodySchema.parse({
      eventId, type, head: { [locale]: { title: "Title", description: "" } },
      questions: [{ question: {
        type: "dropdown", display_order: 1, min_number: 0, max_number: 0, min_length: 0, max_length: 0, is_required: true,
        label: { [locale]: [{ label: "Pick", placeholder: "", choices: { [locale]: [{ label: "One", display_order: 1 }, { label: "Two", display_order: 2 }] } }] },
      } }],
    });
    const saved = await createForm(input, "owner");
    for (const [bounds, path] of [
      [{ type: "number", min_value: 5, max_value: 0 }, "min_value"],
      [{ type: "rating", min_number: 5, max_number: 2 }, "min_number"],
      [{ type: "short_text", min_length: 5, max_length: 2 }, "min_length"],
    ]) {
      const result = createFormBodySchema.safeParse({
        ...input, questions: [{ question: { ...input.questions[0].question, ...bounds } }],
      });
      assert.equal(result.success, false);
      assert.deepEqual(result.error.issues[0].path, ["questions", 0, "question", path]);
    }
    const options = saved.questions[0].question.label[locale][0].choices;
    assert.deepEqual(options[locale].map((c) => c.label), ["One", "Two"]);
    assert.deepEqual(options[other].map((c) => c.label), ["", ""]);
    assert.deepEqual(options[locale].map((c) => c.id), options[other].map((c) => c.id));
    assert.equal(completeFormLocale(saved, other), locale);
    assert.equal((await updateFormStatus(saved.id, { status: "scheduled", opensAt }, "owner")).status, "scheduled");
  }
  const otherEvent = randomUUID();
  rows.events.push({ id: otherEvent, has_survey: true });
  const mixed = await createForm(createFormBodySchema.parse({
    eventId: otherEvent, type: "survey", head: { th: { title: "Thai heading", description: "" } },
    questions: [{ question: {
      type: "dropdown", display_order: 1, min_number: 0, max_number: 0, min_length: 0, max_length: 0, is_required: true,
      label: { en: [{ label: "English question", placeholder: "", choices: { en: [{ label: "First", display_order: 1 }] } }] },
    } }],
  }), "owner");
  await assert.rejects(updateFormStatus(mixed.id, { status: "scheduled", opensAt }, "owner"), { code: "FORM_NOT_READY", status: 400 });
  assert.equal(rows.forms.find((form) => form.id === mixed.id).status, "draft");
});

test("the form service rejects new past dates and invalid merged windows while preserving saved schedules", async (t) => {
  const cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), "event-form-schedule-"));
  t.after(() => fs.rmSync(cacheDir, { recursive: true, force: true }));
  const now = Date.now();
  const past = new Date(now - 3_600_000).toISOString();
  const recent = new Date(now - 1_800_000).toISOString();
  const future = new Date(now + 3_600_000).toISOString();
  const form = {
    id: "test-form",
    event_id: "test-event",
    type: "survey",
    status: "draft",
    opens_at: past,
    closes_at: future,
  };
  const writes = [];
  const load = loadSource({
    "node:os": { tmpdir: () => cacheDir },
    "@/core/api/mock-client": {
      mockApi: {
        async get(resource) {
          if (resource === `/forms/${form.id}`) return { ...form };
          if (resource === `/events/${form.event_id}`) return { id: form.event_id };
          if (resource.includes("?")) return [];
          throw new Error(`Unexpected read ${resource}`);
        },
        getFresh(resource) { return this.get(resource); },
        async put(resource, body) {
          assert.equal(resource, `/forms/${form.id}`);
          writes.push(body);
          return body;
        },
        async post(resource, body) {
          assert.ok(["/form_translations", "/audit_logs"].includes(resource));
          return body;
        },
      },
    },
  });
  const { createForm, updateForm, updateFormStatus } = load("src/services/event/forms.ts");
  const input = { eventId: form.event_id, type: form.type, questions: [] };
  await assert.rejects(createForm({ ...input, opens_at: past }, "owner"), {
    code: "FORM_SCHEDULE_IN_PAST",
  });
  await assert.rejects(updateForm(form.id, { ...input, closes_at: recent }, "owner"), {
    code: "FORM_SCHEDULE_IN_PAST",
  });
  await assert.rejects(updateFormStatus(form.id, { status: "scheduled" }, "owner"), {
    code: "FORM_SCHEDULE_IN_PAST",
  });
  await assert.rejects(updateFormStatus(form.id, { status: "scheduled", opensAt: future }, "owner"), {
    code: "DATE_RANGE_INVALID",
  });
  assert.deepEqual(writes, []);

  const editorSave = {
    ...input,
    head: {
      th: { title: "Updated form", description: "" },
      en: { title: "Updated form", description: "" },
    },
  };
  const saved = await updateForm(form.id, editorSave, "owner");
  assert.equal(saved.status, "draft");
  assert.equal(saved.opensAt, past);
  assert.equal(saved.closesAt, future);
  assert.equal(writes.length, 1);

  form.status = "scheduled";
  await assert.rejects(updateForm(form.id, editorSave, "owner"), {
    code: "FORM_NOT_EDITABLE",
  });
  const reverted = await updateFormStatus(form.id, { status: "draft" }, "owner");
  assert.equal(reverted.status, "draft");
  assert.equal(reverted.opensAt, past);
  assert.equal(reverted.closesAt, future);
  assert.equal(writes.length, 2);
});
