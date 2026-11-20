/* eslint-disable @typescript-eslint/no-require-imports -- Node's standalone TypeScript test harness. */
const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSource } = require("./support/load-source.cjs");
const { preparePublicFormAnswers } = loadSource()("src/core/event/public-form-response.ts");

function question(type, options = {}) {
  const label = { label: "Question", choices: { en: [{ id: "choice-1", display_order: 1 }], th: [] } };
  return { question: {
    id: type, type, display_order: 1, label: { en: [label], th: [] }, is_required: true,
    min_length: 0, max_length: 0, min_number: 0, max_number: 0, rating_max: 5, ...options,
  } };
}

test("participant answers bind to saved questions and the reporting tables' typed columns", () => {
  const inputs = {
    short_text: "  First  ", long_text: " Explanatory text ", email: "member@example.test",
    number: "-1.25", rating: 0, multiple_choice: "choice-1", dropdown: "choice-1", checkbox: ["choice-1"],
    date: "2028-02-29 23:15", time: "00:01",
  };
  const form = { questions: Object.keys(inputs).map((type) => question(type, { rating_display: "linear_scale" })) };
  const result = preparePublicFormAnswers(form, inputs, "th");
  assert.equal(result.ok, true);
  const answers = Object.fromEntries(result.answers.map((row) => [row.field_id, row]));
  assert.equal(answers.short_text.value_text, "First");
  assert.equal(answers.long_text.value_text, "Explanatory text");
  assert.equal(answers.email.value_text, inputs.email);
  assert.equal(answers.number.value_number, -1.25);
  assert.equal(answers.rating.value_number, 0);
  for (const type of ["multiple_choice", "dropdown", "checkbox"]) {
    assert.deepEqual(answers[type].optionIds, ["choice-1"]);
    assert.equal(answers[type].value_text, null);
  }
  assert.equal(answers.date.value_date, "2028-02-29");
  assert.equal(answers.date.value_time, "23:15");
  assert.equal(answers.time.value_time, "00:01");
  assert.equal(answers.time.value_date, null);
});

test("participant answers reject invalid shapes, bounds, dates, selections and unknown questions", () => {
  for (const [type, value, config] of [
    ["short_text", " ", {}], ["short_text", "x", { min_length: 2 }], ["long_text", "long", { max_length: 3 }],
    ["email", "bad@", {}], ["number", "1e400", {}], ["number", "0xff", {}],
    ["number", -1, { min_value: 0 }], ["number", 10, { max_number: 8 }],
    ["rating", 1.5, {}], ["rating", 0, {}], ["rating", 6, {}],
    ["dropdown", ["choice-1"], {}], ["multiple_choice", "other", {}],
    ["checkbox", ["choice-1", "choice-1"], {}], ["checkbox", [1], {}], ["checkbox", "choice-1", {}],
    ["date", "2026-02-29 09:15", {}], ["time", "24:01", {}], ["short_text", [], { is_required: false }],
  ]) {
    const form = { questions: [question(type, config)] };
    const error = preparePublicFormAnswers(form, { [type]: value }, "en");
    assert.equal(error.ok, false, type + " " + JSON.stringify(value));
    assert.equal(error.fieldId, type);
  }
  const optional = { questions: [question("checkbox", { is_required: false })] };
  for (const input of [null, [], true, { extraneous: "key" }, { checkbox: {} }]) {
    assert.equal(preparePublicFormAnswers(optional, input, "en").ok, false);
  }
  assert.deepEqual(preparePublicFormAnswers(optional, { checkbox: [] }, "en"), { ok: true, answers: [] });
  assert.deepEqual(preparePublicFormAnswers(optional, {}, "en"), { ok: true, answers: [] });
  assert.equal(preparePublicFormAnswers({ questions: [question("number"), question("number")] }, { number: 1 }, "en").ok, false);
});
