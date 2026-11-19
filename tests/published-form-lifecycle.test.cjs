/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node tests use the TypeScript source harness. */
const assert = require("node:assert/strict");
const { mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { test } = require("node:test");
const { loadSource } = require("./support/load-source.cjs");

const opens = "2090-08-05T02:00:00.000Z";
const eventClose = "2090-08-05T10:00:00.000Z";
const surveyClose = "2090-08-12T10:00:00.000Z";

function fixture(t) {
  const cacheDir = mkdtempSync(join(tmpdir(), "event-published-forms-"));
  t.after(() => rmSync(cacheDir, { recursive: true, force: true }));
  const previous = process.env.EVENT_SETUP_DATA_SECRET;
  process.env.EVENT_SETUP_DATA_SECRET =
    "published-form-lifecycle-fixture-secret";
  t.after(() => {
    if (previous === undefined) delete process.env.EVENT_SETUP_DATA_SECRET;
    else process.env.EVENT_SETUP_DATA_SECRET = previous;
  });
  let now = Date.parse(opens) - 60_000;
  t.mock.method(Date, "now", () => now);

  const event = {
    id: "snapshot-lifecycle-event",
    slug: "snapshot-lifecycle",
    status: "open",
    is_private: false,
    has_registration: false,
    has_survey: true,
    survey_access: "public",
    start_at: opens,
    end_at: eventClose,
    deleted_at: null,
  };
  const row = {
    id: "snapshot-lifecycle-survey",
    event_id: event.id,
    type: "survey",
    status: "draft",
    opens_at: null,
    closes_at: null,
    deleted_at: null,
    created_at: opens,
    created_by: "owner",
    updated_at: opens,
    updated_by: "owner",
  };
  const title = "Frozen Survey";
  const label = {
    label: "Published question",
    placeholder: "",
    choices: { th: [], en: [] },
  };
  const head = {
    th: { title, description: "" },
    en: { title, description: "" },
  };
  const questions = [
    {
      question: {
        id: "q1",
        type: "short_text",
        display_order: 1,
        min_number: 0,
        max_number: 0,
        min_length: 0,
        max_length: 255,
        required: true,
        label: { th: [label], en: [label] },
      },
    },
  ];
  const snapshot = {
    id: row.id,
    eventId: event.id,
    type: row.type,
    status: "scheduled",
    opensAt: opens,
    closesAt: surveyClose,
    createdAt: opens,
    updatedAt: opens,
    head,
    questions,
  };

  const writes = [];
  const load = loadSource({
    "node:os": { tmpdir: () => cacheDir },
    "@/core/api/mock-client": {
      mockApi: {
        async get(resource) {
          if (resource === `/forms/${row.id}`) return structuredClone(row);
          if (
            resource === "/forms" ||
            resource === `/forms?event_id=${event.id}`
          )
            return [structuredClone(row)];
          if (resource === `/events/${event.id}`) return structuredClone(event);
          if (resource === `/events?slug=${event.slug}`)
            return [structuredClone(event)];
          if (
            /^\/(event_translations|event_banners|event_form_settings)\?/.test(
              resource,
            )
          )
            return [];
          throw new Error(`Unexpected read ${resource}`);
        },
        getFresh(resource) {
          return this.get(resource);
        },
        async put(resource, body) {
          assert.equal(resource, `/forms/${row.id}`);
          writes.push(body);
          Object.assign(row, body);
          return structuredClone(row);
        },
      },
    },
  });
  const { encodeSetupRecord } = load("src/core/event/setup-storage.ts");
  const { defaultEventBranding } = load("src/core/event/branding.ts");
  const attachSnapshot = () => {
    event.setup = encodeSetupRecord(event.id, {
      revision: 1,
      draft: null,
      branding: {},
      whitelist: null,
      pendingMedia: {},
      publication: {
        publishedAt: opens,
        draft: {
          eventName: "Snapshot lifecycle event",
          description: null,
          locationName: "Atrium",
          startsAt: opens,
          endsAt: eventClose,
          isPrivate: false,
          hasRegistration: false,
          hasSurvey: true,
          surveyAccess: "public",
        },
        branding: defaultEventBranding,
        forms: { registration: null, survey: snapshot },
      },
    });
  };
  return {
    load,
    row,
    event,
    snapshot,
    attachSnapshot,
    writes,
    setTime(value) {
      now = Date.parse(value);
    },
    forms: load("src/services/event/forms.ts"),
    participant: load("src/services/event/public-event.ts"),
  };
}

test("a published draft is scheduled without a form row write and progresses using frozen Event Setup windows", async (t) => {
  const {
    forms,
    participant,
    row,
    event,
    snapshot,
    attachSnapshot,
    writes,
    setTime,
  } = fixture(t);
  assert.deepEqual(
    await participant.getPublicFormBySlug(event.slug, row.type),
    { status: "unavailable" },
  );
  attachSnapshot();

  const record = await forms.getForm(row.id);
  assert.deepEqual((await forms.listForms(event.id, [row.type])).forms, [
    record,
  ]);
  assert.equal(record.status, "scheduled");
  assert.equal(record.opensAt, opens);
  assert.equal(record.closesAt, surveyClose);
  assert.equal(record.head.th.title, snapshot.head.th.title);
  assert.equal(record.questions[0].question.is_required, true);
  assert.equal(
    record.canEdit || record.canDelete || record.canChangeStatus,
    false,
  );
  assert.equal(row.status, "draft");
  assert.deepEqual(writes, []);
  assert.deepEqual(
    await participant.getPublicFormBySlug(event.slug, row.type),
    { status: "scheduled" },
  );
  assert.ok(
    (await participant.getPublicEventBySlug(event.slug, "en")).formLinks.survey,
  );
  assert.deepEqual((await forms.runFormsCron()).opened, []);

  setTime(opens);
  // The event may be published after its start, before either form worker runs.
  assert.equal((await participant.getPublicFormBySlug(event.slug, row.type)).status, "open");
  assert.equal((await forms.getForm(row.id)).status, "open");
  assert.equal(row.status, "draft");
  assert.deepEqual(writes, []);
  assert.deepEqual((await forms.runFormsCron()).opened, [row.id]);
  assert.equal(row.status, "open");
  assert.equal(row.opens_at, null);
  const open = await participant.getPublicFormBySlug(event.slug, row.type);
  assert.equal(open.status, "open");
  assert.equal(open.form.head.th.title, snapshot.head.th.title);

  event.status = "closed";
  setTime(eventClose);
  assert.deepEqual((await forms.runFormsCron()).closed, []);
  assert.equal(
    (await participant.getPublicFormBySlug(event.slug, row.type)).status,
    "open",
  );
  row.status = "paused";
  assert.equal(
    (await participant.getPublicFormBySlug(event.slug, row.type)).status,
    "unavailable",
  );
  row.status = "closed";
  assert.equal(
    (await participant.getPublicFormBySlug(event.slug, row.type)).status,
    "closed",
  );
  row.status = "open";
  setTime(surveyClose);
  assert.equal((await forms.getForm(row.id)).status, "closed");
  assert.equal((await participant.getPublicFormBySlug(event.slug, row.type)).status, "closed");
  assert.equal(row.status, "open");
  assert.deepEqual((await forms.runFormsCron()).closed, [row.id]);

  row.id = "replacement-record";
  row.status = "open";
  assert.deepEqual(
    await participant.getPublicFormBySlug(event.slug, row.type),
    { status: "unavailable" },
  );
  assert.equal(
    (await participant.getPublicEventBySlug(event.slug, "en")).formLinks.survey,
    undefined,
  );
});

test("form mutations queued behind Publish recheck the locked snapshot before writing", async (t) => {
  const { forms, load, row, event, attachSnapshot, writes } = fixture(t);
  const { writeSerially } = load("src/core/event/serial-write.ts");
  let finish;
  const pendingPublish = new Promise((resolve) => {
    finish = resolve;
  });
  const publish = writeSerially(event.id, async () => {
    await pendingPublish;
    attachSnapshot();
  });
  const input = { eventId: event.id, type: row.type, questions: [] };
  const blocked = [
    assert.rejects(forms.createForm(input, "owner"), {
      code: "FORM_TYPE_EXISTS",
    }),
    assert.rejects(forms.updateForm(row.id, input, "owner"), {
      code: "FORM_NOT_EDITABLE",
    }),
    assert.rejects(
      forms.updateFormStatus(row.id, { status: "draft" }, "owner"),
      { code: "FORM_STATUS_LOCKED" },
    ),
    assert.rejects(forms.deleteForm(row.id, "owner"), {
      code: "FORM_NOT_DELETABLE",
    }),
  ];
  finish();
  await Promise.all([publish, ...blocked]);
  assert.deepEqual(writes, []);

  row.status = "scheduled";
  await assert.rejects(
    forms.updateFormStatus(row.id, { status: "draft" }, "owner"),
    { code: "FORM_STATUS_LOCKED" },
  );
});
