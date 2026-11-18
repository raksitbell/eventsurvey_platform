/* eslint-disable @typescript-eslint/no-require-imports -- Standalone tests use the repo's TypeScript transpiler. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

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
    getRolePermissions: async (role) =>
      role === "owner" ? ["manage_sub_user"] : [],
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
