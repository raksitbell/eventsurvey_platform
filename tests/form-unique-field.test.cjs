/* eslint-disable @typescript-eslint/no-require-imports -- The Node test runner loads the TypeScript source. */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const { loadSource } = require("./support/load-source.cjs");

const load = loadSource();
const { canToggleUniqueField, uniqueFieldIssue } = load("src/core/forms/unique-field.ts");
const { whitelistRegistrationBuilderHref, whitelistUniqueField } = load("src/core/event/whitelist.ts");

function field(id, type, is_unique = false) {
  return { question: { id, type, is_unique } };
}

test("only one supported question can be marked across all form translations", () => {
  const email = field("contact", "email", true);
  const name = field("name", "short_text");
  const legacy = field("old", "rating", true);
  assert.equal(canToggleUniqueField(email.question, true), true);
  assert.equal(canToggleUniqueField(name.question, true), false);
  assert.equal(canToggleUniqueField(name.question, false), true);
  assert.equal(canToggleUniqueField(legacy.question, true), true);
  assert.equal(canToggleUniqueField(field("rating", "rating").question, false), false);

  assert.equal(uniqueFieldIssue([email, name]), null);
  assert.equal(uniqueFieldIssue([name]), null);
  assert.equal(uniqueFieldIssue([legacy]), "FORM_UNIQUE_FIELD_TYPE");
  assert.equal(uniqueFieldIssue([email, legacy]), "FORM_UNIQUE_FIELD_LIMIT");
  for (const type of ["email", "short_text", "number"]) {
    const form = { type: "registration", questions: [field("selected", type, true)] };
    assert.equal(whitelistUniqueField(form)?.type, type);
    assert.equal(whitelistUniqueField({ ...form, type: "survey" }), null);
  }
  assert.equal(whitelistUniqueField({ type: "registration", questions: [email, legacy] }), null);
});

test("the locked Whitelist links to a builder the registration manager can edit", () => {
  const workspace = {
    canManageWhitelist: true,
    canEditEvent: true,
    hasRegistration: true,
    isPrivate: true,
    eventStatus: "draft",
  };
  assert.equal(whitelistRegistrationBuilderHref(workspace), "/event/setup/registration");
  assert.equal(whitelistRegistrationBuilderHref({ ...workspace, canEditEvent: false }), "/event/form/registration");
  for (const changes of [{ canManageWhitelist: false }, { setup: { publication: {} } }, { isPrivate: false }, { eventStatus: "open" }]) {
    assert.equal(whitelistRegistrationBuilderHref({ ...workspace, ...changes }), undefined);
  }
});

test("draft creation, editing, and scheduling reject invalid Unique Fields before persisting", async () => {
  const id = "unique-field-legacy-form";
  const form = { id, type: "registration", event_id: "unique-field-event", status: "draft" };
  const legacy = [field("email", "email", true), field("id", "number", true)];
  const service = loadSource({
    "@/core/api/mock-client": {
      mockApi: {
        async get(resource) {
          if (resource === `/forms/${id}`) return form;
          if (resource === `/events/${form.event_id}`) return { id: form.event_id };
          if (resource.startsWith("/form_fields?")) {
            return legacy.map(({ question }, display_order) => ({ ...question, form_id: id, display_order }));
          }
          if (resource.includes("?")) return [];
          throw new Error(`Unexpected read ${resource}`);
        },
        getFresh(resource) { return this.get(resource); },
      },
    },
  })("src/services/event/forms.ts");
  for (const [questions, code] of [[legacy, "FORM_UNIQUE_FIELD_LIMIT"], [[field("unsupported", "long_text", true)], "FORM_UNIQUE_FIELD_TYPE"]]) {
    const input = { eventId: form.event_id, type: form.type, questions };
    await assert.rejects(service.createForm(input, "owner"), { code, status: 400 });
    await assert.rejects(service.updateForm(id, input, "owner"), { code, status: 400 });
  }
  await assert.rejects(service.updateFormStatus(id, {
    status: "scheduled", opensAt: new Date(Date.now() + 3_600_000).toISOString(),
  }, "owner"), { code: "FORM_UNIQUE_FIELD_LIMIT", status: 400 });
});

test("two concurrent saves with different new Unique Fields leave one active selection", async (t) => {
  const fs = require("node:fs");
  const os = require("node:os");
  const path = require("node:path");
  const cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), "form-unique-fields-"));
  t.after(() => fs.rmSync(cacheDir, { recursive: true, force: true }));
  const form = { id: "concurrent-form", event_id: "concurrent-event", type: "registration", status: "draft" };
  const rows = { events: [{ id: form.event_id }], forms: [form], form_fields: [], field_translations: [], form_translations: [], field_options: [] };
  function matching(resource) {
    const url = new URL(resource, "https://fixture.example.test");
    const [, name, id] = url.pathname.split("/");
    const matches = rows[name].filter((row) => (
      (!id || row.id === id) && [...url.searchParams].every(([key, value]) => row[key] === value)
    ));
    return id ? matches[0] : matches;
  }
  const service = loadSource({
    "node:os": { tmpdir: () => cacheDir },
    "@/core/audit/write": { writeAuditLog: async () => {} },
    "@/core/api/mock-client": {
      mockApi: {
        async get(resource) { return structuredClone(matching(resource)); },
        getFresh(resource) { return this.get(resource); },
        async post(resource, data) { rows[resource.slice(1)].push(data); return data; },
        async put(resource, data) { return Object.assign(matching(resource), data); },
        async patch(resource, data) { return Object.assign(matching(resource), data); },
      },
    },
  })("src/services/event/forms.ts");
  const labels = { en: [], th: [] };
  const head = { en: { title: "Registration" }, th: { title: "ลงทะเบียน" } };
  const edit = (type) => service.updateForm(form.id, {
    head, type: form.type, questions: [{ question: { type, is_unique: true, display_order: 1, label: labels } }],
  }, "owner");

  await Promise.all([edit("email"), edit("number")]);
  assert.equal(rows.form_fields.length, 2);
  const live = rows.form_fields.filter((row) => !row.deleted_at && row.is_unique);
  assert.deepEqual(live.map((row) => row.type), ["number"]);
});
