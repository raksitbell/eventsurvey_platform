/* eslint-disable @typescript-eslint/no-require-imports -- Node's standalone test runner. */
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { test } = require("node:test");
const { loadSource } = require("./support/load-source.cjs");
const { setupMockData, origin } = require("./support/mock-data.cjs");
const { participantCollections } = require("./support/participant-event.cjs");

function fixture(t, options) {
  const env = { AUTH_SESSION_SECRET: "participant-submission-fixture-secret-32-bytes", MOCK_API_BASE_URL: origin, MOCK_API_GET_CACHE_TTL_MS: "0" };
  for (const [key, value] of Object.entries(env)) {
    const original = process.env[key];
    process.env[key] = value;
    t.after(() => { if (original == null) delete process.env[key]; else process.env[key] = original; });
  }
  const { collections, failures } = setupMockData(t, { eventWrites: true });
  const { db, ids, slug } = participantCollections(options);
  Object.assign(collections, db);
  const load = loadSource();
  const servicePath = "src/services/event/participant-submissions.ts";
  const { submitPublicForm, recoverPublicSubmission } = load(servicePath);
  // An independent server worker shares the store but has no local queue in common.
  const { submitPublicForm: separateWorker } = loadSource({
    "@/core/event/serial-write": { writeSerially: (_id, operation) => operation() },
  })(servicePath);
  const { getPublicFormBySlug } = load("src/services/event/public-event.ts");
  const receipts = load("src/core/event/registration-receipt.ts");
  function input(kind, answers, identifier) {
    return { requestId: receipts.submissionRequestKey(slug, kind, randomUUID()), locale: "en", answers, identifier };
  }
  return {
    ids, slug, db, failures, receipts, input,
    read: (kind, identifier, receipt) => getPublicFormBySlug(slug, kind, identifier, receipt),
    submit: (kind, data, receipt) => submitPublicForm(slug, kind, data, receipt),
    submitElsewhere: (kind, data, receipt) => separateWorker(slug, kind, data, receipt),
    recover: (kind, key) => recoverPublicSubmission(slug, kind, key),
  };
}

test("Private registration persists answers and unlocks only its own survey after successful registration", async (t) => {
  const { ids, slug, db, read, submit, input, receipts, recover } = fixture(t);
  const email = "member@example.test";
  const registration = input("registration", { [ids.email]: email }, email);
  const survey = input("survey", { [ids.topic]: ids.yes });
  assert.equal((await read("registration")).status, "eligibility");
  assert.equal((await read("survey", email)).status, "registrationRequired");
  assert.equal((await submit("survey", survey)).status, "registrationRequired");
  assert.equal((await submit("registration", { ...registration, identifier: "outsider@example.test" })).status, "eligibility");
  assert.equal(db.form_submissions.filter((s) => s.status === "submitted").length, 0);
  const mismatched = await submit("registration", { ...registration, answers: { [ids.email]: "second@example.test" } });
  assert.notEqual(mismatched.status, "submitted");

  const saved = await submit("registration", registration);
  assert.equal(saved.status, "submitted");
  const cookie = receipts.issueRegistrationCookie(slug, saved.registration, saved.receiptExpiresAt);
  assert.equal(cookie.httpOnly, true);
  assert.equal(cookie.path, `/event/${slug}`);
  const proof = receipts.readRegistrationProof(slug, cookie.value);
  assert.deepEqual(proof, saved.registration);
  assert.equal(receipts.readRegistrationProof("other-event", cookie.value), undefined);
  assert.equal(receipts.readRegistrationProof(slug, cookie.value + "!"), undefined);
  assert.equal(receipts.readRegistrationProof(slug, cookie.value, cookie.expires.getTime()), undefined);
  assert.equal((await submit("registration", registration)).registration.submissionId, proof.submissionId);
  assert.equal((await recover("registration", registration.requestId)).registration.submissionId, proof.submissionId);
  assert.equal(await recover("survey", registration.requestId), null);
  assert.equal((await submit("registration", { ...registration, answers: { [ids.email]: "second@example.test" } })).status, "requestChanged");
  assert.equal((await read("survey", undefined, { ...proof, eventId: "other" })).status, "registrationRequired");
  assert.equal((await read("survey", undefined, proof)).status, "open");
  assert.equal(db.registrations.length, 1);
  assert.ok(db.submission_answers.some((a) => a.field_id === ids.email && a.value_text === email));
  assert.equal((await submit("survey", survey, proof)).status, "submitted");
  assert.equal((await submit("survey", survey, proof)).status, "submitted");
  assert.equal((await submit("survey", input("survey", { [ids.topic]: ids.no }), proof)).status, "duplicate");
  assert.equal(db.form_submissions.filter((s) => s.status === "submitted").length, 2);
  assert.equal(db.answer_option_selections.length, 1);
  assert.equal(db.answer_option_selections[0].option_id, ids.yes);

  db.form_submissions.find((row) => row.id === proof.submissionId).status = "cancelled";
  assert.equal((await read("survey", undefined, proof)).status, "registrationRequired");
  assert.equal((await recover("registration", registration.requestId)).status, "duplicate");
});

test("Public form rejects invalid answers and concurrent registrations respect the last seat", async (t) => {
  const { ids, db, read, submit, submitElsewhere, input } = fixture(t, { privateEvent: false, capacity: 1, surveyAccess: "public" });
  assert.equal((await read("survey")).status, "open");
  const invalid = await submit("survey", input("survey", { [ids.topic]: "missing-option" }));
  assert.equal(invalid.status, "invalid");
  assert.equal(db.answer_option_selections.length, 0);
  const requests = ["member", "second"].map((name) => input("registration", { [ids.email]: `${name}@example.test` }));
  const results = await Promise.all([submit("registration", requests[0]), submitElsewhere("registration", requests[1])]);
  assert.deepEqual(results.map((r) => r.status).sort(), ["full", "submitted"]);
  assert.equal(db.registrations.length, 1);
  assert.equal((await submit("survey", input("survey", { [ids.topic]: ids.yes }))).status, "submitted");
});

function schedulePublishedForms(db, registrationStart, surveyStart) {
  const { encodeSetupRecord, readSetupRecord } = loadSource()("src/core/event/setup-storage.ts");
  const event = db.events[0];
  const setup = readSetupRecord(event);
  event.status = "scheduled";
  event.start_at = new Date(registrationStart).toISOString();
  setup.publication.draft.startsAt = event.start_at;
  setup.publication.forms.registration.opensAt = event.start_at;
  setup.publication.forms.survey.opensAt = new Date(surveyStart).toISOString();
  event.setup = encodeSetupRecord(event.id, setup);
}

test("Published registration and survey show real questions before opening and accept responses at the exact instant", async (t) => {
  const { db, ids, input, read, submit } = fixture(t, { privateEvent: false, surveyAccess: "public" });
  const opening = Date.parse("2030-01-03T08:20:00Z");
  let now = opening - 1;
  t.mock.method(Date, "now", () => now);
  schedulePublishedForms(db, opening, opening);
  const registration = input("registration", { [ids.email]: "early@example.test" });
  const survey = input("survey", { [ids.topic]: ids.yes });
  for (const [kind, field, request] of [["registration", ids.email, registration], ["survey", ids.topic, survey]]) {
    const early = await read(kind);
    assert.equal(early.status, "scheduled");
    assert.equal(early.opensAt, new Date(opening).toISOString());
    assert.equal(early.form.questions[0].question.id, field);
    assert.equal((await submit(kind, request)).status, "scheduled");
  }
  assert.deepEqual(db.form_submissions, []);
  assert.deepEqual(db.submission_answers, []);
  assert.deepEqual(db.registrations, []);
  now = opening;
  for (const [kind, request] of [["registration", registration], ["survey", survey]]) {
    assert.equal((await read(kind)).status, "open");
    assert.equal((await submit(kind, request)).status, "submitted");
  }
  assert.equal(db.events[0].status, "scheduled");
  assert.equal(db.form_submissions.length, 2);
  db.forms.find((row) => row.type === "survey").status = "paused";
  assert.deepEqual(await read("survey"), { status: "unavailable" });
  db.forms.find((row) => row.type === "registration").status = "closed";
  assert.deepEqual(await read("registration"), { status: "closed" });
});

test("Scheduled private forms release questions only to invited or registered participants", async (t) => {
  const { db, ids, input, read, submit } = fixture(t);
  const regStart = Date.parse("2030-02-10T09:00:00Z");
  const surveyStart = regStart + 60_000;
  let now = regStart - 1;
  t.mock.method(Date, "now", () => now);
  schedulePublishedForms(db, regStart, surveyStart);
  const email = "member@example.test";
  const registration = input("registration", { [ids.email]: email }, email);
  const survey = input("survey", { [ids.topic]: ids.yes });
  const gate = await read("registration", "unknown@example.test");
  assert.equal(gate.status, "eligibility");
  assert.equal(gate.form, undefined);
  assert.equal((await read("registration", email)).form.questions[0].question.id, ids.email);
  assert.equal((await submit("registration", registration)).status, "scheduled");
  assert.deepEqual(await read("survey"), { status: "registrationRequired" });
  assert.equal(db.whitelist_entries.length, 0);
  now = regStart;
  const proof = (await submit("registration", registration)).registration;
  assert.ok(proof);
  const earlySurvey = await read("survey", undefined, proof);
  assert.equal(earlySurvey.status, "scheduled");
  assert.equal(earlySurvey.form.questions[0].question.id, ids.topic);
  assert.equal((await submit("survey", survey, proof)).status, "scheduled");
  assert.equal(db.form_submissions.length, 1);
  now = surveyStart;
  assert.equal((await submit("survey", survey, proof)).status, "submitted");
});

test("A failed answer write grants no registration and retry commits exactly one response", async (t) => {
  const { ids, db, failures, read, submit, input, recover } = fixture(t, { privateEvent: false });
  const registration = input("registration", { [ids.email]: "member@example.test" });
  failures.set("POST /submission_answers", "temporary fixture failure");
  await submit("registration", registration).then((result) => assert.notEqual(result.status, "submitted"), () => {});
  assert.equal(db.form_submissions.filter((row) => row.status === "submitted").length, 0);
  assert.equal((await read("survey")).status, "registrationRequired");
  failures.clear();
  // A refreshed tab only retains its opaque retry key.
  const result = await recover("registration", registration.requestId);
  assert.equal(result.status, "submitted");
  assert.equal((await submit("registration", registration)).registration.submissionId, result.registration.submissionId);
  assert.equal(db.submission_answers.length, 1);
  assert.equal(db.registrations.length, 1);
});

test("Independent workers cannot use the same unique identifier or registration twice", async (t) => {
  const { db, ids, input, submit, submitElsewhere } = fixture(t, { privateEvent: false });
  const register = () => input("registration", { [ids.email]: "member@example.test" });
  const registrations = await Promise.all([submit("registration", register()), submitElsewhere("registration", register())]);
  assert.deepEqual(registrations.map((result) => result.status).sort(), ["duplicate", "submitted"]);
  const proof = registrations.find((result) => result.status === "submitted").registration;
  const answers = await Promise.all([
    submit("survey", input("survey", { [ids.topic]: ids.yes }), proof),
    submitElsewhere("survey", input("survey", { [ids.topic]: ids.no }), proof),
  ]);
  assert.deepEqual(answers.map((result) => result.status).sort(), ["duplicate", "submitted"]);
  assert.equal(db.form_submissions.length, 2);
  assert.equal(db.answer_option_selections.length, 1);
});

test("A legacy snapshot with display orders saves the owning field and option IDs", async (t) => {
  const { db, ids, input, submit } = fixture(t, { privateEvent: false, surveyAccess: "public" });
  const { readSetupRecord, encodeSetupRecord } = loadSource()("src/core/event/setup-storage.ts");
  const event = db.events[0];
  const setup = readSetupRecord(event);
  const question = setup.publication.forms.survey.questions[0].question;
  delete question.id;
  for (const choice of question.label.en[0].choices.en) delete choice.id;
  event.setup = encodeSetupRecord(event.id, setup);
  assert.equal((await submit("survey", input("survey", { "1": "legacy-choice-2" }))).status, "submitted");
  assert.equal(db.submission_answers[0].field_id, ids.topic);
  assert.equal(db.answer_option_selections[0].option_id, ids.no);
});

test("an admin cancellation closes all form links and rejects new submissions even before a failed form write is retried", async (t) => {
  const { db, ids, slug, read, submit, input, failures } = fixture(t, { privateEvent: false, surveyAccess: "public" });
  const load = loadSource();
  const { updateAdminEventStatus, runEventLifecycleCron } = load("src/services/admin/events.ts");
  const { getPublicEventBySlug } = load("src/services/event/public-event.ts");
  const event = db.events[0];
  event.status = "closed";
  event.end_at = "2021-01-01T12:00:00.000Z";
  assert.equal((await read("survey")).status, "open");
  const failure = "PATCH /forms/" + ids.survey;
  failures.set(failure, "temporary failure");
  await assert.rejects(updateAdminEventStatus(event.id, "cancel", "admin"));
  assert.ok(event.cancelled_at);
  for (const kind of ["registration", "survey"]) {
    assert.deepEqual(await read(kind), { status: "closed" });
    assert.deepEqual(await submit(kind, input(kind, {})), { status: "closed" });
  }
  assert.deepEqual((await getPublicEventBySlug(slug, "en")).formLinks, {});
  assert.equal(db.form_submissions.length, 0);
  failures.delete(failure);
  assert.deepEqual((await runEventLifecycleCron("admin")).formsClosed, [ids.survey]);
  await updateAdminEventStatus(event.id, "cancel", "admin");
  assert.ok(db.forms.every(form => form.status === "closed"));
});

test("manual close with active forms requires confirmation and immediately closes both forms", async (t) => {
  const { db } = fixture(t, { privateEvent: false, surveyAccess: "public" });
  const { updateAdminEventStatus } = loadSource()("src/services/admin/events.ts");
  const event = db.events[0];
  await assert.rejects(updateAdminEventStatus(event.id, "close", "admin"), { code: "CLOSE_HAS_ACTIVE_FORMS" });
  assert.ok(!event.cancelled_at);
  await updateAdminEventStatus(event.id, "close", "admin", "en", { force: true });
  assert.ok(event.cancelled_at);
  assert.ok(db.forms.every(form => form.status === "closed"));
});
