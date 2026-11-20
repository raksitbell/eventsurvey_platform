/* eslint-disable @typescript-eslint/no-require-imports -- Shared fixture for public participant flows. */
const { loadSource } = require("./load-source.cjs");

function participantCollections({ privateEvent = true, capacity = null, surveyAccess = "registered_only" } = {}) {
  const load = loadSource();
  const { encodeSetupRecord } = load("src/core/event/setup-storage.ts");
  const { defaultEventBranding } = load("src/core/event/branding.ts");
  const slug = "participant-review";
  const eventId = "62e4e663-b682-4e1b-baae-6fce920e1718";
  const startsAt = "2020-01-01T12:00:00.000Z";
  const endsAt = "2099-01-01T12:00:00.000Z";
  const draft = {
    eventName: "Participant review", description: null, locationName: "Hall", startsAt, endsAt,
    isPrivate: privateEvent, hasRegistration: true, hasSurvey: true,
    surveyAccess, registrationCapacity: capacity,
  };
  const ids = {
    registration: "2d201645-12a7-472c-93f9-a4f888c04f75", survey: "b7f63d8f-47a8-4bb8-9ace-bac152f63020",
    email: "a352d090-d769-406b-8220-00a0e6814720", topic: "61421433-1124-40fc-ab40-1bbeeff88947",
    yes: "b75f106f-8d58-4588-abd3-5eb9fb58a210", no: "f98eea23-a50a-4e2c-b41d-96ba15d2a039",
  };
  const choices = [{ id: ids.yes, label: "Yes", display_order: 1 }, { id: ids.no, label: "No", display_order: 2 }];
  function form(type, id, label, options) {
    const text = { label, placeholder: "", choices: { en: options, th: [] } };
    return {
      id: ids[type], eventId, type, status: "scheduled", opensAt: startsAt, closesAt: endsAt,
      createdAt: startsAt, updatedAt: startsAt, head: { en: { title: type === "survey" ? "Survey" : "Register", description: "" } },
      questions: [{ question: {
        id, display_order: 1, type: type === "survey" ? "dropdown" : "email",
        min_number: 0, max_number: 0, min_length: 0, max_length: 255, is_required: true,
        is_unique: type === "registration", label: { en: [text], th: [] },
      } }],
    };
  }
  const forms = { registration: form("registration", ids.email, "Email", []), survey: form("survey", ids.topic, "Attend again?", choices) };
  const whitelist = privateEvent ? {
    formId: ids.registration, fieldId: ids.email, kind: "email",
    entries: ["member", "second"].map((name) => ({ id: name, name, uniqueId: `${name}@example.test`, status: "available" })),
  } : null;
  const event = {
    id: eventId, slug, status: "open", is_private: privateEvent, has_registration: true, has_survey: true,
    default_locale: "en", deleted_at: null, survey_access: surveyAccess, start_at: startsAt, end_at: endsAt,
    setup: encodeSetupRecord(eventId, {
      revision: 2, draft, branding: {}, pendingMedia: {}, whitelist,
      publication: { publishedAt: startsAt, draft, branding: defaultEventBranding, forms },
    }),
  };
  const db = {
    events: [event], forms: Object.values(forms).map((f) => ({
      id: f.id, event_id: eventId, type: f.type, status: "draft", deleted_at: null, opens_at: null, closes_at: null,
    })),
    event_translations: [{ id: "title", event_id: eventId, locale_code: "en", title: draft.eventName }],
    form_fields: Object.values(forms).flatMap((f) => f.questions.map(({ question }) => ({
      id: question.id, form_id: f.id, type: question.type, display_order: 1, deleted_at: null,
    }))),
    field_options: choices.map((c) => ({ ...c, field_id: ids.topic, deleted_at: null })),
    event_banners: [], event_form_settings: [], whitelist_entries: [], form_submissions: [],
    registrations: [], submission_answers: [], answer_option_selections: [],
  };
  return { db, slug, ids };
}

module.exports = { participantCollections };
