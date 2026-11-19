/* eslint-disable @typescript-eslint/no-require-imports -- Standalone tests load the TypeScript services through the existing harness. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { test } = require("node:test");
const { loadSource } = require("./support/load-source.cjs");

function fixture(t) {
  const cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), "event-form-trash-"));
  t.after(() => fs.rmSync(cacheDir, { recursive: true, force: true }));

  const older = "2000-01-01T00:00:00.000Z";
  const form = {
    id: "form",
    event_id: "event",
    type: "survey",
    status: "draft",
    opens_at: null,
    closes_at: null,
    deleted_at: null,
    updated_by: "owner",
    updated_at: older,
    created_at: older,
  };
  const field = {
    id: "field",
    form_id: form.id,
    type: "multiple_choice",
    deleted_at: null,
  };
  const removedField = { ...field, id: "removed-field", deleted_at: older };
  const firstChoice = {
    id: "a",
    field_id: field.id,
    display_order: 1,
    deleted_at: null,
  };
  const secondChoice = {
    id: "b",
    field_id: field.id,
    display_order: 2,
    deleted_at: null,
  };
  const removedChoice = {
    ...firstChoice,
    id: "older-option",
    deleted_at: older,
  };

  const collections = {
    users: [
      {
        id: "owner",
        status: "active",
        event_id: "event",
        system_role: "event_user",
        role_id: null,
      },
      {
        id: "viewer",
        status: "active",
        event_id: "event",
        system_role: "event_user",
        role_id: null,
      },
    ],
    events: [
      { id: "event", slug: "fixture", status: "open", default_locale: "en" },
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
          registrationForm: "restricted",
          surveyForm: "can_edit",
          dashboard: "can_edit",
          canViewSubmissions: true,
          canManageSubmissions: true,
          canExport: true,
        },
        deleted_at: null,
      },
      {
        id: "access-viewer",
        user_id: "viewer",
        event_id: "event",
        role_name: "Viewer",
        can_manage_sub_users: false,
        matrix: {
          event: "view_only",
          registrationForm: "restricted",
          surveyForm: "restricted",
          dashboard: "can_edit",
          canViewSubmissions: false,
          canManageSubmissions: false,
          canExport: false,
        },
        deleted_at: null,
      },
    ],
    event_translations: [],
    forms: [form],
    form_translations: [
      { form_id: form.id, title: "Fixture survey", locale_code: "en" },
    ],
    form_fields: [field, removedField],
    field_translations: [],
    field_options: [firstChoice, secondChoice, removedChoice],
    field_option_translations: [],
    form_submissions: [],
    dashboard_layouts: [],
  };

  class MockApiError extends Error {
    constructor(status) {
      super("Fixture request failed");
      this.status = status;
    }
  }

  const failOnce = new Set();
  const loseResponseOnce = new Set();
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
      filters.every(([key, value]) => row[key] === value),
    );
  }
  const load = loadSource({
    "node:os": { tmpdir: () => cacheDir },
    "@/core/api/mock-client": {
      MockApiError,
      mockApi: {
        async get(resourcePath) {
          return structuredClone(lookup(resourcePath));
        },
        async put(resourcePath, body) {
          Object.assign(lookup(resourcePath), body);
          return structuredClone(body);
        },
        async patch(resourcePath, body) {
          if (failOnce.delete(resourcePath)) throw new MockApiError(500);
          const row = Object.assign(lookup(resourcePath), body);
          if (loseResponseOnce.delete(resourcePath))
            throw new MockApiError(502);
          return structuredClone(row);
        },
      },
    },
  });

  return {
    ...load("src/services/event/forms.ts"),
    ...load("src/services/event/reporting.ts"),
    form,
    field,
    removedField,
    firstChoice,
    secondChoice,
    removedChoice,
    failOnce,
    loseResponseOnce,
    collections,
    cacheDir,
  };
}

test("Trash recovers a portal-deleted form and its own children without a trash_items collection", async (t) => {
  const f = fixture(t);
  assert.deepEqual((await f.getReportingData("owner", "en")).trash, []);
  await f.deleteForm(f.form.id, "owner");
  const deletedAt = f.form.deleted_at;
  assert.ok(deletedAt);
  const cachePath = path.join(f.cacheDir, "eventsurvey-forms-cache-v1.json");
  const staleCache = fs.readFileSync(cachePath);
  await assert.rejects(
    () => f.getForm(f.form.id),
    (error) => error.status === 404,
  );
  assert.deepEqual((await f.listForms("event", ["survey"])).forms, []);
  // An old mock replica returning a live row does not prove it was restored.
  f.form.deleted_at = null;
  await assert.rejects(
    () => f.getForm(f.form.id),
    (error) => error.status === 404,
  );
  assert.deepEqual((await f.listForms("event", ["survey"])).forms, []);
  f.form.deleted_at = deletedAt;

  const [trash] = (await f.getReportingData("owner", "en")).trash;
  assert.equal(trash.name, "Fixture survey");
  assert.equal(trash.canRestore, true);
  assert.deepEqual((await f.getReportingData("viewer", "en")).trash, []);
  await assert.rejects(
    () => f.restoreTrash("viewer", "en", trash.id),
    (error) => error.status === 403,
  );

  f.failOnce.add("/field_options/b");
  await assert.rejects(
    () => f.restoreTrash("owner", "en", trash.id),
    (error) => error.status === 500,
  );
  assert.equal(f.form.deleted_at, deletedAt);
  assert.equal(f.field.deleted_at, deletedAt);
  assert.equal(f.firstChoice.deleted_at, null);
  assert.equal(f.secondChoice.deleted_at, deletedAt);
  assert.equal((await f.getReportingData("owner", "en")).trash[0].id, trash.id);

  f.loseResponseOnce.add("/forms/form");
  assert.deepEqual(await f.restoreTrash("owner", "en", trash.id), { ok: true });
  assert.equal(f.form.deleted_at, null);
  assert.equal(f.field.deleted_at, null);
  assert.equal(f.secondChoice.deleted_at, null);
  assert.equal(f.removedField.deleted_at, "2000-01-01T00:00:00.000Z");
  assert.equal(f.removedChoice.deleted_at, "2000-01-01T00:00:00.000Z");
  assert.deepEqual((await f.getReportingData("owner", "en")).trash, []);
  assert.deepEqual(JSON.parse(fs.readFileSync(cachePath)).deletedIds, []);

  // Another forms handler can still have its previous on-disk cache.
  fs.writeFileSync(cachePath, staleCache);
  assert.deepEqual(
    (await f.listForms("event", ["survey"])).forms.map(({ id }) => id),
    [f.form.id],
  );
  const form = await f.getForm(f.form.id);
  assert.deepEqual(
    form.questions.map(({ question }) => question.id),
    ["field"],
  );
  assert.deepEqual(
    form.questions[0].question.label.en[0].choices.en.map(({ id }) => id),
    ["a", "b"],
  );
  assert.deepEqual(
    (await f.listForms("event", ["survey"])).forms.map(({ id }) => id),
    [f.form.id],
  );
  assert.deepEqual(JSON.parse(fs.readFileSync(cachePath)).deletedIds, []);
});

test("Trash respects legacy decisions and invalidates synthetic IDs when the form changes", async (t) => {
  const f = fixture(t);
  await f.deleteForm(f.form.id, "owner");
  const [first] = (await f.getReportingData("owner", "en")).trash;
  const earlier = f.form.deleted_at;
  f.form.deleted_at = new Date(Date.parse(earlier) + 1).toISOString();
  const [current] = (await f.getReportingData("owner", "en")).trash;
  assert.notEqual(current.id, first.id);
  await assert.rejects(
    () => f.restoreTrash("owner", "en", first.id),
    (error) => error.status === 403,
  );

  const legacyItem = {
    id: "legacy-form-trash",
    event_id: "event",
    resource_type: "form",
    resource_id: f.form.id,
    display_name: "Legacy survey",
    deleted_by_user_id: "owner",
    deleted_at: earlier,
    restored_at: null,
    restore_allowed: false,
  };
  f.collections.trash_items = [legacyItem];
  const [blocked] = (await f.getReportingData("owner", "en")).trash;
  assert.equal(blocked.canRestore, false);
  await assert.rejects(
    () => f.restoreTrash("owner", "en", blocked.id),
    (error) => error.status === 403,
  );

  legacyItem.deleted_at = f.form.deleted_at.replace("Z", "+00:00");
  legacyItem.restore_allowed = true;
  const [matching] = (await f.getReportingData("owner", "en")).trash;
  assert.equal(matching.id, legacyItem.id);
  assert.equal(matching.canRestore, true);

  f.form.event_id = "another-event";
  assert.deepEqual((await f.getReportingData("owner", "en")).trash, []);
  await assert.rejects(
    () => f.restoreTrash("owner", "en", legacyItem.id),
    (error) => error.status === 403,
  );
});
