/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node test runner. */
const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const test = require("node:test");
const { loadSource } = require("./support/load-source.cjs");

function fixture(t, { registration = null, whitelist = [] } = {}) {
  const previous = process.env.EVENT_SETUP_DATA_SECRET;
  process.env.EVENT_SETUP_DATA_SECRET = randomBytes(32).toString("hex");
  t.after(() => {
    if (previous === undefined) delete process.env.EVENT_SETUP_DATA_SECRET;
    else process.env.EVENT_SETUP_DATA_SECRET = previous;
  });
  let event = { id: "event-a", status: "draft", is_private: false };
  let writes = 0;
  const workspace = {
    eventId: event.id,
    canEditEvent: true,
    canManageWhitelist: true,
    userRole: "event_owner",
  };
  const load = loadSource({
    "@/core/api/mock-client": {
      mockApi: {
        get: async (url) => {
          if (url === "/events/event-a") return structuredClone(event);
          if (url === "/forms?event_id=event-a") return registration ? [registration] : [];
          if (url === "/whitelist_entries?event_id=event-a") return whitelist;
          throw Error(`Unexpected fixture request: ${url}`);
        },
        patch: async (url, fields) => {
          assert.equal(url, "/events/event-a");
          assert.equal(typeof fields.setup, "string");
          event = { ...event, ...structuredClone(fields) };
          writes++;
          return structuredClone(event);
        },
      },
    },
    "@/services/event/workspace": { getEventWorkspace: async () => workspace },
    "@/services/event/forms": { getForm: async () => registration },
    "@/services/event/setup-media": { assertEventSetupMedia: async () => {} },
  });
  return {
    service: load("src/services/event/setup.ts"),
    store: load("src/core/event/setup-storage.ts"),
    draft: {
      eventName: "Open House",
      description: "A private draft description",
      locationName: "Atrium",
      content: {
        defaultLocale: "en",
        translations: [
          { localeCode: "en", title: "Open House", description: "A private draft description", locationName: "Atrium", floorZone: null },
          { localeCode: "th", title: "เปิดบ้าน", description: null, locationName: "โถง", floorZone: null },
        ],
      },
      startsAt: new Date(Date.now() + 86400000).toISOString(),
      endsAt: new Date(Date.now() + 172800000).toISOString(),
      isPrivate: false,
      hasRegistration: false,
      hasSurvey: false,
      surveyAccess: null,
    },
    event: () => structuredClone(event),
    writes: () => writes,
  };
}

test("Setup draft is encrypted, round-trips, and protects revisions across saves", async (t) => {
  const { service, store, draft, writes, event } = fixture(t);
  const context = await service.getSetupContext("owner");
  const saved = await service.saveSetupDraft(context, { draft, revision: 0 });
  assert.equal(saved.revision, 1);
  assert.equal(saved.publication, null);
  assert.equal(event().status, "draft");
  assert.equal(event().setup.includes("private draft"), false);
  assert.equal(store.readSetupRecord(event()).draft.content.translations.length, 2);
  assert.throws(() => store.readSetupRecord({ ...event(), id: "event-b" }), {
    code: "SETUP_STORAGE_UNAVAILABLE",
  });

  const replay = await service.saveSetupDraft(context, { draft, revision: 0 });
  assert.equal(replay.revision, 1);
  assert.equal(writes(), 1);
  await assert.rejects(service.saveSetupDraft(context, {
    revision: 0, draft: { ...draft, endsAt: new Date(Date.now() + 259200000).toISOString() },
  }), { code: "SETUP_CONFLICT" });
  assert.equal(writes(), 1);
});

test("Setup rejects new past dates, reversed times, and custom Survey closes before the event ends", async (t) => {
  const { service, draft, writes } = fixture(t);
  const context = await service.getSetupContext("owner");
  const past = "2001-01-01T10:00:00.000Z";
  const save = (changes, revision = 0) => service.saveSetupDraft(context, {
    revision, draft: { ...draft, ...changes },
  });

  await assert.rejects(save({ startsAt: past }), { code: "SETUP_DATE_IN_PAST" });
  await assert.rejects(save({ endsAt: draft.startsAt }), { code: "SETUP_DATE_ORDER" });
  const customSurvey = { hasSurvey: true, surveyAccess: "public", surveyCloseMode: "custom" };
  await assert.rejects(save({ ...customSurvey, surveyCustomClose: past }), { code: "SETUP_DATE_IN_PAST" });
  await assert.rejects(save({ ...customSurvey, surveyCustomClose: draft.startsAt }), {
    code: "SETUP_SURVEY_CLOSE_INVALID",
  });
  assert.equal(writes(), 0);

  const saved = await save({ ...customSurvey, surveyCustomClose: draft.endsAt });
  assert.equal(saved.revision, 1);
  await assert.rejects(save({
    ...customSurvey,
    endsAt: new Date(Date.parse(draft.endsAt) + 60_000).toISOString(),
    surveyCustomClose: draft.endsAt,
  }, saved.revision), { code: "SETUP_SURVEY_CLOSE_INVALID" });
  assert.equal(writes(), 1);
});

test("Existing historical dates survive recovery and unrelated draft edits, with a future start required to publish", async (t) => {
  const { service, draft, event, writes } = fixture(t);
  const context = await service.getSetupContext("owner");
  const startsAt = "2001-01-01T10:00:00.000Z";
  const recovered = await service.recoverSetupDraft(context, {
    revision: 0, replace: false, draft: { ...draft, startsAt },
  });
  const saved = await service.saveSetupDraft(context, {
    revision: recovered.revision, draft: { ...recovered.draft, registrationCapacity: 12 },
  });
  assert.equal(saved.draft.startsAt, startsAt);
  assert.equal(saved.revision, 2);
  await assert.rejects(service.publishSetup(context, { revision: saved.revision, locale: "en" }), {
    code: "SETUP_PUBLISH_IN_PAST",
  });
  assert.equal(event().status, "draft");
  assert.equal(writes(), 2);
});

test("Legacy recovery keeps a private receipt and Publish schedules an immutable revision", async (t) => {
  const { service, store, draft, writes, event } = fixture(t);
  const context = await service.getSetupContext("owner");
  const branding = { primary: "#123456", secondary: "#abcdef", accent: "#111111", logo: null, banner: null };
  const publishedAt = "2026-01-01T00:00:00.000Z";
  const recovered = await service.recoverSetupDraft(context, {
    revision: 0,
    replace: false,
    draft,
    branding: [{ locale: "en", value: branding, pendingMedia: ["logo"] }],
    oldPublication: { publishedAt, draft, branding, forms: { registration: null, survey: null } },
  });
  assert.equal(recovered.revision, 1);
  assert.equal(recovered.recoveredPublicationAt, publishedAt);
  assert.equal(recovered.publication, null);
  assert.equal(event().status, "draft");
  assert.equal(store.readSetupRecord(event()).recoveredPublication.publishedAt, publishedAt);
  await assert.rejects(service.recoverSetupDraft(context, {
    revision: 1, replace: false, draft: { ...draft, endsAt: new Date(Date.now() + 259200000).toISOString() },
  }), { code: "SETUP_RECOVERY_CONFLICT" });
  await assert.rejects(service.publishSetup(context, { revision: 1, locale: "en" }), {
    code: "SETUP_MEDIA_PENDING",
  });

  const draftSaved = await service.saveSetupDraft(context, {
    revision: 1, branding: { locale: "en", value: branding, pendingMedia: [] },
  });
  assert.equal(event().status, "draft");
  const published = await service.publishSetup(context, { revision: draftSaved.revision, locale: "en" });
  assert.equal(event().status, "scheduled");
  assert.equal(published.publication.branding.primary, branding.primary);
  assert.equal(published.publication.forms.registration, null);
  assert.equal(published.publication.forms.survey, null);
  assert.deepEqual(await service.publishSetup(context, { revision: draftSaved.revision, locale: "en" }), published);
  assert.equal(writes(), 3);
  await assert.rejects(service.saveSetupDraft(context, { revision: published.revision, draft }), {
    code: "SETUP_READ_ONLY",
  });
});

test("Saving the current field preserves previously used Whitelist entries without exposing them in the draft", async (t) => {
  const { service, draft, event } = fixture(t, {
    registration: {
      id: "registration-a", event_id: "event-a", eventId: "event-a", type: "registration",
      questions: [{ question: { id: "email-field", type: "email", is_unique: true } }],
    },
    whitelist: [
      { id: "used", event_id: "event-a", access_code: "Old@example.test", username: "Private record", status: "joined" },
    ],
  });
  const context = await service.getSetupContext("owner");
  const saved = await service.saveSetupDraft(context, {
    revision: 0,
    draft: { ...draft, isPrivate: true, hasRegistration: true },
  });
  const whitelist = await service.updateSetupWhitelist(context, {
    revision: saved.revision,
    entries: [
      { id: "replacement-for-used", uniqueId: "old@example.test", name: "Other", status: "available" },
      { id: "new", uniqueId: "New@example.test", name: "New guest", status: "available" },
      { id: "forged", uniqueId: "forged@example.test", name: "Forged", status: "joined" },
    ],
  });
  assert.deepEqual(whitelist.entries.map(({ id, uniqueId, status }) => ({ id, uniqueId, status })), [
    { id: "used", uniqueId: "old@example.test", status: "joined" },
    { id: "new", uniqueId: "new@example.test", status: "available" },
  ]);
  assert.equal(JSON.stringify(service.readSetupState(event())).includes("old@example.test"), false);
  assert.equal(JSON.stringify(event()).includes("new@example.test"), false);
});

test("Parallel edits to the same base revision allow exactly one write", async (t) => {
  const { service, draft, writes } = fixture(t);
  const context = await service.getSetupContext("owner");
  const result = await Promise.allSettled([
    service.saveSetupDraft(context, { revision: 0, draft }),
    service.saveSetupDraft(context, {
      revision: 0, draft: { ...draft, endsAt: new Date(Date.now() + 259200000).toISOString() },
    }),
  ]);
  assert.equal(writes(), 1);
  assert.equal(result[0].status, "fulfilled");
  assert.equal(result[1].status, "rejected");
  assert.equal(result[1].reason.code, "SETUP_CONFLICT");
});
