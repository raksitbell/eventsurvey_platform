/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node test runner. */
const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const test = require("node:test");
const { loadSource } = require("./support/load-source.cjs");

function fixture(t, { registration = null, whitelist = [], forms = [] } = {}) {
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
    viewableFormTypes: ["registration", "survey"],
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
        post: async (url, body) => {
          if (url === "/audit_logs") return body;
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
    "@/services/event/forms": {
      getForm: async () => registration,
      listForms: async () => ({ forms }),
    },
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

test("A saved event start may pass before publication without invalidating its draft", async (t) => {
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
  const published = await service.publishSetup(context, { revision: saved.revision, locale: "en" });
  assert.equal(published.publication.draft.startsAt, startsAt);
  assert.equal(event().status, "open");
  assert.equal(event().opens_at, published.publication.publishedAt);
  assert.equal(writes(), 3);
});

test("Publishing after the saved event end preserves the original dates and records a closed event", async (t) => {
  const { service, draft, event } = fixture(t);
  const context = await service.getSetupContext("owner");
  const endsAt = "2001-01-02T10:00:00.000Z";
  const { revision } = await service.recoverSetupDraft(context, {
    revision: 0, replace: false, draft: { ...draft, startsAt: "2001-01-01T10:00:00.000Z", endsAt },
  });
  const { publication } = await service.publishSetup(context, { revision, locale: "en" });
  assert.equal(publication.draft.endsAt, endsAt);
  assert.equal(event().status, "closed");
  assert.equal(event().closes_at, publication.publishedAt);
});

test("An incomplete draft can be saved and corrected after a direct publication attempt", async (t) => {
  const { service, draft, event } = fixture(t);
  const context = await service.getSetupContext("owner");
  const { revision } = await service.saveSetupDraft(context, { revision: 0, draft: { ...draft, endsAt: null } });
  await assert.rejects(service.publishSetup(context, { revision, locale: "en" }), {
    code: "SETUP_EVENT_DETAILS_REQUIRED", details: { field: "endsAt", issue: "required" },
  });
  const corrected = await service.saveSetupDraft(context, { revision, draft: { ...draft, hasSurvey: true, surveyAccess: "public" } });
  await assert.rejects(service.publishSetup(context, { revision: corrected.revision, locale: "en" }), { code: "SETUP_SURVEY_FORM_REQUIRED" });
  assert.equal(event().status, "draft");
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

test("Publishing a public event freezes only its enabled forms and their schedules", async (t) => {
  const label = { label: "Name", placeholder: "", choices: { th: [], en: [] } };
  const forms = ["registration", "survey"].map((type) => ({
    id: `${type}-a`, eventId: "event-a", type, status: "draft",
    opensAt: null, closesAt: null,
    createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
    head: { th: { title: "แบบฟอร์ม", description: "" }, en: { title: "Form", description: "" } },
    questions: [{ question: {
      type: "short_text", display_order: 1, min_number: 0, max_number: 0,
      min_length: 0, max_length: 255, is_required: true, label: { th: [label], en: [label] },
    } }],
  }));
  for (const [hasRegistration, hasSurvey] of [[false, false], [true, false], [false, true], [true, true]]) {
    await t.test(`registration=${hasRegistration}, survey=${hasSurvey}`, async (t) => {
      const { service, store, draft, event, writes } = fixture(t, { forms });
      const context = await service.getSetupContext("owner");
      const surveyClose = new Date(Date.parse(draft.endsAt) + 60_000).toISOString();
      const saved = await service.saveSetupDraft(context, {
        revision: 0,
        draft: {
          ...draft, hasRegistration, hasSurvey, surveyAccess: hasSurvey ? "public" : null,
          surveyCloseMode: "custom", surveyCustomClose: surveyClose,
        },
      });
      const published = await service.publishSetup(context, { revision: saved.revision, locale: "en" });
      const snapshot = store.readSetupRecord(event()).publication.forms;
      for (const [type, enabled, close] of [["registration", hasRegistration, draft.endsAt], ["survey", hasSurvey, surveyClose]]) {
        if (!enabled) {
          assert.equal(snapshot[type], null);
          assert.equal(published.publication.forms[type], null);
          continue;
        }
        assert.deepEqual(published.publication.forms[type], { id: snapshot[type].id, closesAt: close });
        assert.equal(snapshot[type].status, "scheduled");
        assert.equal(snapshot[type].opensAt, draft.startsAt);
        assert.equal(snapshot[type].closesAt, close);
      }
      assert.ok(forms.every((form) => form.status === "draft" && form.opensAt === null && form.closesAt === null));
      assert.equal(event().status, "scheduled");
      assert.equal(writes(), 2);
    });
  }
});

test("Setup publication accepts a complete TH or EN form and rejects options split between translations", async (t) => {
  for (const locale of ["th", "en"]) {
    const other = locale === "th" ? "en" : "th";
    const choices = [{ label: "First", display_order: 1 }, { label: "Second", display_order: 2 }];
    const question = {
      type: "dropdown", display_order: 1, min_number: 0, max_number: 0,
      min_length: 0, max_length: 0, is_required: true,
      label: { [locale]: [{ label: "Choose", placeholder: "", choices: { [locale]: choices } }] },
    };
    const registration = {
      id: "registration-a", eventId: "event-a", type: "registration", status: "draft",
      opensAt: null, closesAt: null, createdAt: "", updatedAt: "",
      head: { [locale]: { title: "Form", description: "" } }, questions: [{ question }],
    };
    const { service, store, draft, event, writes } = fixture(t, { forms: [registration] });
    const context = await service.getSetupContext("owner");
    const { revision } = await service.saveSetupDraft(context, {
      revision: 0, draft: { ...draft, hasRegistration: true },
    });
    // A heading in one language cannot make the other language's options publishable.
    question.label[locale][0].choices = { [other]: choices };
    question.label[other] = [{ label: "Choose", placeholder: "", choices: { [other]: choices } }];
    await assert.rejects(service.publishSetup(context, { revision, locale: other }), {
      code: "SETUP_REGISTRATION_FORM_REQUIRED", status: 422,
    });
    assert.equal(writes(), 1);
    delete question.label[other];
    question.label[locale][0].choices = { [locale]: choices };
    await service.publishSetup(context, { revision, locale: other });
    const form = store.readSetupRecord(event()).publication.forms.registration;
    assert.equal(form.head[locale].title, "Form");
    assert.equal(form.head[other].title, "");
    assert.deepEqual(form.questions[0].question.label[locale][0].choices[locale], choices);
  }
});

test("Whitelist reads require registration management and an editable private event with registration", async (t) => {
  const { service, draft } = fixture(t);
  const context = await service.getSetupContext("owner");
  await assert.rejects(service.getSetupWhitelist({
    ...context, event: { ...context.event, is_private: false, has_registration: true },
  }), { message: "SETUP_WHITELIST_UNAVAILABLE" });
  const legacyPrivate = await service.getSetupWhitelist({
    ...context, event: { ...context.event, is_private: true, has_registration: false },
  });
  assert.equal(legacyPrivate.uniqueField, null);
  await service.saveSetupDraft(context, {
    revision: 0, draft: { ...draft, isPrivate: true, hasRegistration: true },
  });
  const privateContext = await service.getSetupContext("owner");
  await assert.rejects(service.getSetupWhitelist({
    ...privateContext, workspace: { ...privateContext.workspace, canManageWhitelist: false },
  }), { message: "FORBIDDEN" });
  await assert.rejects(service.getSetupWhitelist({
    ...privateContext, event: { ...privateContext.event, status: "closed" },
  }), { message: "SETUP_READ_ONLY" });
  const result = await service.getSetupWhitelist({
    ...privateContext, workspace: { ...privateContext.workspace, canEditEvent: false },
  });
  assert.deepEqual(result.entries, []);
  assert.equal(result.uniqueField, null);
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

test("Private publication requires a guest on the current registration field regardless of prior participation", async (t) => {
  const { publishedWhitelistAccess } = loadSource()("src/core/event/whitelist.ts");
  const label = { label: "Email", placeholder: "", choices: { en: [], th: [] } };
  const question = {
    id: "email-field", type: "email", is_unique: true, is_required: true,
    display_order: 1, min_number: 0, max_number: 5, min_length: 0, max_length: 255,
    label: { en: [label], th: [] },
  };
  const registration = {
    id: "registration-a", event_id: "event-a", eventId: "event-a", type: "registration",
    status: "draft", opensAt: null, closesAt: null, createdAt: "", updatedAt: "",
    head: { en: { title: "Register", description: "" } }, questions: [{ question }],
  };
  const survey = {
    ...registration, id: "survey-a", type: "survey",
    questions: [{ question: { ...question, id: "survey-field", is_unique: false } }],
  };
  const used = { id: "used", event_id: "event-a", access_code: "used@example.test", username: "Used", status: "joined" };
  const guest = { id: "guest", uniqueId: "Guest@example.test", name: "Guest", status: "available" };

  for (const scenario of ["empty", "used-only", "current", "first-guest", "replaced-field"]) {
    await t.test(scenario, async (t) => {
      const current = structuredClone(registration);
      const { service, store, draft, event } = fixture(t, {
        registration: current, forms: [current, survey], whitelist: ["empty", "first-guest"].includes(scenario) ? [] : [used],
      });
      const context = await service.getSetupContext("owner");
      const saved = await service.saveSetupDraft(context, {
        revision: 0,
        draft: { ...draft, isPrivate: true, hasRegistration: true, hasSurvey: true, surveyAccess: "registered_only" },
      });
      let revision = saved.revision;
      if (["current", "first-guest", "replaced-field"].includes(scenario)) {
        const list = await service.updateSetupWhitelist(context, { revision, entries: [guest] });
        revision = list.revision;
      }
      if (scenario === "replaced-field") current.questions[0].question.id = "different-field";
      const input = { revision, locale: "en" };
      if (scenario === "empty" || scenario === "replaced-field") {
        await assert.rejects(service.publishSetup(context, input), { code: "SETUP_WHITELIST_REQUIRED" });
        assert.equal(event().status, "draft");
        assert.equal(store.readSetupRecord(event()).publication, null);
        return;
      }
      const published = await service.publishSetup(context, input);
      assert.equal(event().status, "scheduled");
      assert.equal(published.publication.draft.surveyAccess, "registered_only");
      assert.doesNotMatch(JSON.stringify(published), /guest@example\.test|used@example\.test/i);
      const record = store.readSetupRecord(event());
      const allowed = publishedWhitelistAccess(record);
      assert.deepEqual(allowed.entries, [
        ...(scenario === "first-guest" ? [] : [{ id: "used", uniqueId: "used@example.test", name: "Used", status: "joined" }]),
        ...(scenario === "used-only" ? [] : [{ ...guest, uniqueId: "guest@example.test" }]),
      ]);
    });
  }
});
