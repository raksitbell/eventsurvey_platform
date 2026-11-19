/* eslint-disable @typescript-eslint/no-require-imports -- Standalone tests use the repo's TypeScript transpiler. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const { loadSource } = require("./support/load-source.cjs");

const sourceRoot = path.join(__dirname, "../src");
const cache = new Map();
const event = {
  id: "event-1",
  slug: "book-expo",
  status: "open",
  default_locale: "th",
  has_registration: true,
  has_survey: true,
  is_private: false,
  survey_access: "public",
  start_at: "2020-01-01T00:00:00Z",
  end_at: "2099-01-08T00:00:00Z",
};
const forms = ["registration", "survey"].map((kind) => ({
  id: kind,
  event_id: event.id,
  type: kind,
  status: "open",
  opens_at: event.start_at,
  closes_at: "2099-01-09T00:00:00Z",
}));
const user = {
  id: "owner-1",
  event_id: event.id,
  role_id: "owner",
  system_role: "event_user",
  status: "active",
};
let settings = [];
let submissions = [];
const substitutions = {
  "@/core/api/mock-client": {
    MockApiError: class MockApiError extends Error {},
    mockApi: {
      get: async (resource) => {
        if (resource.startsWith("/events?")) return [{ ...event }];
        if (resource === "/events/event-1") return { ...event };
        if (resource.startsWith("/users/")) return { ...user };
        if (resource.startsWith("/event_translations?"))
          return [
            { event_id: event.id, locale_code: "th", title: "งานหนังสือ" },
            { event_id: event.id, locale_code: "en", title: "Book Expo" },
          ];
        if (resource.startsWith("/event_banners?"))
          return [
            {
              event_id: event.id,
              banner_url: "data:image/png;sample",
            },
          ];
        if (resource.startsWith("/forms?"))
          return forms.map((form) => ({ ...form }));
        if (resource.startsWith("/event_form_settings?")) return settings;
        if (resource.startsWith("/form_submissions?")) return submissions;
        throw new Error(`Unexpected Mock API request: ${resource}`);
      },
    },
  },
  "@/core/mock/role-permissions": {
    // Signature is (userId, eventId); owner vs assistant still toggled via user.role_id in this fixture.
    getRolePermissions: async (userId) =>
      userId === user.id && user.role_id === "owner"
        ? ["manage_sub_user"]
        : [],
  },
  "@/services/event/forms": {
    getForm: async (kind) => ({
      eventId: event.id,
      type: kind,
      status: forms.find((form) => form.type === kind).status,
      head: { en: { title: kind }, th: { title: "" } },
      questions: [{ question: { id: "question-1", is_required: true } }],
    }),
  },
};
function load(importPath) {
  if (Object.hasOwn(substitutions, importPath))
    return substitutions[importPath];
  if (!importPath.startsWith("@/")) return require(importPath);
  if (cache.has(importPath)) return cache.get(importPath);
  const mod = { exports: {} };
  cache.set(importPath, mod.exports);
  const file = path.join(sourceRoot, `${importPath.slice(2)}.ts`);
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  new Function("require", "exports", source)(load, mod.exports);
  return mod.exports;
}

const { getAssignedShareLinks, getPublicEventBySlug, getPublicFormBySlug } =
  load("@/services/event/public-event");
const { eventShareOrigin, eventShareUrl } = load("@/core/event/share-links");
const { eventQrPng } = load("@/core/event/share-qr");
const { nextCronFormStatus } = load("@/core/forms/lifecycle");
const origin = "https://demo.example.test";

test("uses an explicit trusted origin and the Trello path for each destination", () => {
  assert.equal(eventShareOrigin(origin), origin);
  assert.equal(
    eventShareOrigin("http://localhost:3001", true),
    "http://localhost:3001",
  );
  for (const invalid of [
    "http://demo.example.test",
    origin + "/preview",
    origin + "?debug",
    "https://name:password@demo.example.test",
    "https://demo.example.test/#link",
  ]) {
    assert.equal(eventShareOrigin(invalid, true), null);
  }
  const eventUrl = eventShareUrl(origin, event.slug);
  assert.equal(eventUrl, origin + "/event/book-expo");
  assert.equal(
    eventShareUrl(origin, event.slug, "registration"),
    eventUrl + "/register",
  );
  assert.equal(
    eventShareUrl(origin, event.slug, "survey"),
    eventUrl + "/survey",
  );
});

test("uses shared Mock data for QR links and restricts distribution to the assigned owner", async (t) => {
  const previousOrigin = process.env.APP_URL;
  process.env.APP_URL = origin;
  t.after(() => {
    if (previousOrigin === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = previousOrigin;
    user.role_id = "owner";
  });

  const share = await getAssignedShareLinks(user.id);
  assert.deepEqual(share.links, {
    event: origin + "/event/book-expo",
    registration: origin + "/event/book-expo/register",
    survey: origin + "/event/book-expo/survey",
  });
  assert.equal(share.windows.registration.closesAt, "2099-01-08T00:00:00.000Z");
  assert.equal(share.windows.survey.closesAt, "2099-01-09T00:00:00.000Z");
  const page = await getPublicEventBySlug(event.slug, "en");
  assert.equal(page.draft.eventName, "Book Expo");
  assert.equal(page.bannerUrl, null);
  assert.equal(page.formLinks.registration.href, "/event/book-expo/register");
  assert.match(page.formLinks.survey.qrDataUrl, /^data:image\/png;base64,/);
  const png = await eventQrPng(share.links.survey);
  assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  user.role_id = "assistant";
  await assert.rejects(getAssignedShareLinks(user.id), {
    code: "FORBIDDEN",
    status: 403,
  });
});

test("shows a scheduled event, hides a draft and blocks unintegrated eligibility checks", async (t) => {
  t.after(() =>
    Object.assign(event, {
      status: "open",
      is_private: false,
      survey_access: "public",
    }),
  );
  event.status = "draft";
  assert.equal(await getPublicEventBySlug(event.slug, "th"), null);
  assert.equal(await getPublicFormBySlug(event.slug, "registration"), null);
  event.status = "scheduled";
  assert.deepEqual(
    (await getPublicEventBySlug(event.slug, "th")).formLinks,
    {},
  );
  assert.deepEqual(await getPublicFormBySlug(event.slug, "survey"), {
    status: "scheduled",
  });
  event.status = "open";
  event.is_private = true;
  event.survey_access = "registered_only";
  assert.deepEqual(
    (await getPublicEventBySlug(event.slug, "th")).formLinks,
    {},
  );
  assert.deepEqual(await getPublicFormBySlug(event.slug, "registration"), {
    status: "restricted",
  });
  assert.deepEqual(await getPublicFormBySlug(event.slug, "survey"), {
    status: "restricted",
  });
});

test("honors server capacity and keeps a direct post-event survey available", async (t) => {
  t.after(() => {
    event.status = "open";
    settings = [];
    submissions = [];
  });
  settings = [
    {
      event_id: event.id,
      form_type: "registration",
      capacity: 1,
      is_unlimited: false,
    },
  ];
  submissions = [
    { form_id: "registration", status: "submitted" },
    { form_id: "registration", status: "cancelled" },
  ];
  assert.deepEqual(await getPublicFormBySlug(event.slug, "registration"), {
    status: "full",
  });
  event.status = "closed";
  assert.deepEqual(await getPublicFormBySlug(event.slug, "registration"), {
    status: "closed",
  });
  assert.equal(
    (await getPublicFormBySlug(event.slug, "survey")).status,
    "open",
  );

  const afterEvent = Date.parse("2099-01-08T12:00:00Z");
  assert.equal(nextCronFormStatus(forms[0], event, afterEvent), "closed");
  assert.equal(nextCronFormStatus(forms[1], event, afterEvent), null);
  const surveyClose = Date.parse(forms[1].closes_at);
  assert.equal(nextCronFormStatus(forms[1], event, surveyClose), "closed");
  const publishedSurvey = { ...forms[1], status: "published" };
  assert.equal(nextCronFormStatus(publishedSurvey, event, afterEvent), null);
  assert.equal(nextCronFormStatus(publishedSurvey, event, surveyClose), "closed");
  for (const status of ["pending_approval", "approved", "rejected", "paused", "archived"]) {
    assert.equal(nextCronFormStatus({ ...forms[1], status }, event, surveyClose), null);
  }
});

test("does not distribute a missing or draft form, including by direct URL", async (t) => {
  t.after(() => {
    forms[0].status = "open";
    delete forms[1].deleted_at;
  });
  forms[0].status = "draft";
  forms[1].deleted_at = new Date().toISOString();
  assert.deepEqual(
    (await getPublicEventBySlug(event.slug, "en")).formLinks,
    {},
  );
  assert.deepEqual(await getPublicFormBySlug(event.slug, "registration"), {
    status: "unavailable",
  });
  assert.deepEqual(await getPublicFormBySlug(event.slug, "survey"), {
    status: "unavailable",
  });
});


test("both cron jobs honor the published Survey window after the Event closes", async (t) => {
  const survey = forms[1];
  const originals = {
    event: { ...event },
    forms: forms.map((form) => ({ ...form })),
  };
  let now = Date.parse("2099-01-09T00:00:00Z");
  t.mock.method(Date, "now", () => now);
  t.after(() => {
    delete event.setup;
    Object.assign(event, originals.event);
    forms.forEach((form, i) => Object.assign(form, originals.forms[i]));
  });

  const writeFormStatus = async (resource, updates) => {
    const form = forms.find((row) => resource === `/forms/${row.id}`);
    assert.ok(form);
    form.status = updates.status;
    return form;
  };
  const cronLoad = loadSource({
    "node:fs": { existsSync: () => false },
    "@/core/mail/send-invite": { sendSetupPasswordInvite: async () => {} },
    "@/core/api/mock-client": {
      mockApi: {
        get: async (resource) => {
          if (resource === "/events") return [{ ...event }];
          if (resource === `/events/${event.id}`) return { ...event };
          if (resource === "/forms" || resource === `/forms?event_id=${event.id}`) {
            return forms.map((form) => ({ ...form }));
          }
          throw new Error(`Unexpected Mock API request: ${resource}`);
        },
        patch: async (resource, updates) => {
          if (resource === `/events/${event.id}`) {
            event.status = updates.status;
            return event;
          }
          return writeFormStatus(resource, updates);
        },
        put: writeFormStatus,
      },
    },
  });
  const { runEventLifecycleCron, getEventCloseWarnings } = cronLoad("src/services/admin/events.ts");
  const { runFormsCron } = cronLoad("src/services/event/forms.ts");
  const { withPublishedFormSchedule } = cronLoad("src/core/forms/published-schedule.ts");
  const { encodeSetupRecord } = load("@/core/event/setup-storage");
  const { defaultEventBranding } = load("@/core/event/branding");
  const secret = process.env.EVENT_SETUP_DATA_SECRET;
  process.env.EVENT_SETUP_DATA_SECRET = "eventsurvey-schedule-regression-test-key";
  t.after(() => {
    if (secret === undefined) delete process.env.EVENT_SETUP_DATA_SECRET;
    else process.env.EVENT_SETUP_DATA_SECRET = secret;
  });

  const draft = {
    eventName: "Book Expo",
    description: null,
    locationName: "Atrium",
    startsAt: event.start_at,
    endsAt: event.end_at,
    isPrivate: false,
    hasRegistration: true,
    hasSurvey: true,
    surveyAccess: "public",
  };
  // Historical publications stored the resolved closing time even when the
  // draft omitted its (then one-week) default.
  const publishedClose = "2099-01-15T00:00:00.000Z";
  const head = {
    en: { title: "Survey", description: "" },
    th: { title: "แบบสอบถาม", description: "" },
  };
  const label = { label: "Feedback", placeholder: "", choices: { th: [], en: [] } };
  event.setup = encodeSetupRecord(event.id, {
    revision: 4,
    draft: null,
    branding: {},
    pendingMedia: {},
    whitelist: null,
    publication: {
      publishedAt: event.start_at,
      draft,
      branding: defaultEventBranding,
      forms: {
        registration: null,
        survey: {
          id: survey.id,
          eventId: event.id,
          type: "survey",
          status: "open",
          opensAt: event.start_at,
          closesAt: publishedClose,
          createdAt: event.start_at,
          updatedAt: event.start_at,
          head,
          questions: [{
            question: {
              type: "short_text",
              display_order: 1,
              min_number: 0,
              max_number: 0,
              min_length: 0,
              max_length: 255,
              is_required: false,
              label: { th: [label], en: [label] },
            },
          }],
        },
      },
    },
  });

  forms[0].closes_at = event.end_at;
  survey.closes_at = event.end_at;
  const replacement = { ...survey, id: "replacement-survey" };
  assert.equal(withPublishedFormSchedule(replacement, event), replacement);

  const warnings = await getEventCloseWarnings(event.id);
  const surveyWarning = warnings.find(({ formId }) => formId === survey.id);
  assert.equal(surveyWarning.closesAt, publishedClose);
  assert.deepEqual(surveyWarning.reasons, ["still_open", "not_expired", "post_event"]);

  const lifecycle = await runEventLifecycleCron("platform-admin");
  assert.deepEqual(lifecycle.closed, [event.id]);
  assert.deepEqual(lifecycle.formsClosed, [forms[0].id]);
  assert.deepEqual((await runFormsCron(now)).closed, []);
  survey.status = "scheduled";
  survey.opens_at = publishedClose;
  assert.deepEqual((await runFormsCron(now)).opened, [survey.id]);
  assert.equal((await getPublicFormBySlug(event.slug, "survey")).status, "open");
  assert.equal(survey.closes_at, event.end_at);
  assert.equal(survey.opens_at, publishedClose);

  survey.status = "closed";
  assert.equal((await getPublicFormBySlug(event.slug, "survey")).status, "closed");
  survey.status = "open";

  now = Date.parse(publishedClose);
  assert.deepEqual((await runFormsCron(now)).closed, [survey.id]);
  assert.equal((await getPublicFormBySlug(event.slug, "survey")).status, "closed");
  survey.status = "open";
  assert.deepEqual((await runEventLifecycleCron("platform-admin")).formsClosed, [survey.id]);
});

test("public forms resolve published branding by locale for both form kinds and status pages", async () => {
  const { defaultEventBranding } = load("@/core/event/branding");
  const fallback = { ...defaultEventBranding, primary: "#123456" };
  const english = { ...fallback, footerColor: "#765432", chromeOpacity: 60 };
  const setup = {
    publication: {
      draft: { hasRegistration: true, hasSurvey: true },
      branding: fallback,
    },
    publishedBranding: { en: english },
    branding: { en: { ...english, primary: "#ABCDEF" } },
  };
  const read = loadSource({
    ...substitutions,
    "@/core/api/mock-client": {
      mockApi: { get: async () => [{ ...event, status: "scheduled" }] },
    },
    "@/core/event/setup-storage": { readSetupRecord: () => setup },
  });
  const { getPublicFormPageBySlug } = read("src/services/event/public-event.ts");
  for (const kind of ["registration", "survey"]) {
    assert.deepEqual(await getPublicFormPageBySlug(event.slug, kind, "en"), {
      result: { status: "scheduled" }, branding: english, bannerUrl: null,
    });
    assert.equal((await getPublicFormPageBySlug(event.slug, kind, "th")).branding, fallback);
  }
  setup.publication = null;
  assert.deepEqual(
    (await getPublicFormPageBySlug(event.slug, "survey", "en")).branding,
    defaultEventBranding,
  );
});

test("private participant forms disclose questions only after a matching published whitelist identifier", async (t) => {
  const { defaultEventBranding } = load("@/core/event/branding");
  const snapshots = Object.fromEntries(forms.map((form) => [form.type, {
    id: form.id, eventId: event.id, type: form.type, status: "open",
    opensAt: event.start_at, closesAt: event.end_at,
    head: { th: { title: "Private title" }, en: { title: "Private title" } },
    questions: [
      { question: { id: "member", type: "email", is_unique: form.type === "registration",
        label: { th: [{ label: "อีเมล" }], en: [{ label: "Email" }] } } },
      { question: { id: "secret", type: "short_text", label: { th: [{ label: "Private question" }], en: [{ label: "Private question" }] } } },
    ],
  }]));
  const whitelist = {
    formId: snapshots.registration.id, fieldId: "member", kind: "email",
    entries: [{ id: "1", name: "Private person", uniqueId: "person@example.com", status: "available" }],
  };
  const setup = { publication: {
    draft: { isPrivate: true, hasRegistration: true, hasSurvey: true, surveyAccess: "public", registrationCapacity: 1 },
    forms: snapshots, branding: defaultEventBranding,
  }, whitelist };
  let joined = [], capacityTaken = false, eventStatus = "open";
  const mockedGet = substitutions["@/core/api/mock-client"].mockApi.get;
  const readMock = async (resource) => {
      if (resource === "/events/event-1") return { ...event, status: eventStatus };
      if (resource.startsWith("/events?")) return [{ ...event, status: eventStatus }];
      if (resource.startsWith("/whitelist_entries?")) return joined;
      if (resource.startsWith("/form_submissions?")) return capacityTaken ? [{ form_id: snapshots.registration.id, status: "submitted" }] : [];
      return mockedGet(resource);
  };
  const read = loadSource({
    ...substitutions,
    "@/core/event/setup-storage": { readSetupRecord: () => setup },
    "@/core/api/mock-client": { mockApi: { get: readMock, getFresh: readMock } },
  });
  const { getPublicFormBySlug: open, getPublicFormPageBySlug: page, getPublicEventBySlug: home } = read("src/services/event/public-event.ts");
  const enter = (value) => open(event.slug, "registration", value);
  const gate = { status: "eligibility", fieldType: "email", label: { th: "อีเมล", en: "Email" } };
  const initial = await page(event.slug, "registration", "en");
  assert.deepEqual(initial.result, gate);
  assert.doesNotMatch(JSON.stringify(initial), /Private question|Private person|person@example.com|Private title/);
  assert.deepEqual(await enter({ lookup: true }), gate);
  assert.deepEqual(await enter("unknown@example.com"), gate);
  assert.deepEqual(await open(event.slug, "survey"), gate);
  assert.equal((await enter(" PERSON@example.com ")).status, "open");
  assert.equal((await open(event.slug, "survey", "person@example.com")).status, "open");
  assert.equal(whitelist.entries[0].status, "available");
  assert.ok((await home(event.slug, "en")).formLinks.registration);

  joined = [{ event_id: event.id, access_code: "PERSON@example.com", deleted_at: null, status: "joined" }];
  assert.deepEqual(await enter("person@example.com"), gate);
  joined = [];
  whitelist.entries[0].status = "joined";
  assert.deepEqual(await enter("person@example.com"), gate);
  assert.equal((await open(event.slug, "survey", "person@example.com")).status, "open");
  whitelist.entries[0].status = "available";
  capacityTaken = true;
  assert.deepEqual(await enter("person@example.com"), { status: "full" });
  capacityTaken = false;
  snapshots.registration.closesAt = "2000-01-01T00:00:00Z";
  assert.deepEqual(await enter("person@example.com"), { status: "closed" });
  setup.publication.draft.surveyAccess = "registered_only";
  assert.deepEqual(await open(event.slug, "survey", "person@example.com"), { status: "restricted" });
  const previousOrigin = process.env.APP_URL;
  process.env.APP_URL = origin;
  t.after(() => {
    if (previousOrigin === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = previousOrigin;
  });
  eventStatus = "scheduled";
  const organizer = await read("src/services/event/public-event.ts").getAssignedShareLinks(user.id);
  assert.ok(organizer.links.registration.endsWith("/register"));
  assert.deepEqual(await enter("person@example.com"), { status: "scheduled" });
  assert.deepEqual((await home(event.slug, "en")).formLinks, {});
  eventStatus = "open";
  setup.publication.draft.surveyAccess = "public";
  snapshots.registration.eventId = "other-event";
  assert.deepEqual(await open(event.slug, "survey", "person@example.com"), { status: "restricted" });
  snapshots.registration.eventId = event.id;
  whitelist.fieldId = "wrong-question";
  assert.deepEqual(await enter("person@example.com"), { status: "restricted" });
});
