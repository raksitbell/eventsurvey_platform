/* eslint-disable @typescript-eslint/no-require-imports -- Node's standalone test runner loads TypeScript through the shared harness. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { loadSource } = require("./support/load-source.cjs");

const load = loadSource();
const { filterActivity, getActivitySummary, getMockActivityData } = load(
  "src/services/activity/mock.ts",
);

const noFilters = {
  search: "",
  eventId: "",
  action: "",
  month: "",
  actorId: "",
};

test("platform mock activity resolves all records and calculates its summary", () => {
  const data = getMockActivityData();
  const results = filterActivity(data, noFilters, "en");
  const summary = getActivitySummary(results);

  assert.equal(summary.total, 436);
  assert.equal(summary.eventCount, 4);
  assert.equal(summary.actorCount, 12);
  assert.equal(summary.edit, 180);
  assert.equal(summary.edit + summary.add + summary.delete, 436);
  assert.equal(new Set(results.map(({ id }) => id)).size, results.length);
  assert.ok(
    results.every(({ eventId }) =>
      data.events.some(({ id }) => id === eventId),
    ),
  );
  assert.ok(
    results.every(({ actorUserId }) =>
      data.actors.some(({ id }) => id === actorUserId),
    ),
  );
  assert.ok(
    results.every(
      ({ occurredAt }, index) =>
        index === 0 || occurredAt <= results[index - 1].occurredAt,
    ),
  );
  assert.equal(results[0].id, "activity-survey-deadline");
});

test("event mock activity uses only the assigned event and matches the platform example", () => {
  const assignedEvent = { id: "workspace-event", name: "Assigned event" };
  const scopedData = getMockActivityData(assignedEvent);
  const platformData = getMockActivityData();
  const platformResults = filterActivity(
    platformData,
    { ...noFilters, eventId: "book-expo-2026" },
    "en",
  );
  const scopedResults = filterActivity(scopedData, noFilters, "en");

  assert.deepEqual(scopedData.events, [assignedEvent]);
  assert.equal(scopedResults.length, 128);
  assert.equal(scopedData.actors.length, 6);
  assert.deepEqual(getActivitySummary(scopedResults), {
    total: 128,
    eventCount: 1,
    actorCount: 6,
    edit: 49,
    add: 69,
    delete: 10,
  });
  assert.deepEqual(
    scopedResults.slice(0, 5).map(({ id }) => id),
    [
      "activity-survey-deadline",
      "activity-event-details",
      "activity-expo-member-added",
      "activity-whitelist-deleted",
      "activity-registration-capacity",
    ],
  );
  assert.ok(scopedResults.every(({ eventId }) => eventId === assignedEvent.id));
  assert.deepEqual(
    platformResults.map(({ id }) => id),
    scopedResults.map(({ id }) => id),
  );
  assert.deepEqual(
    filterActivity(
      scopedData,
      { ...noFilters, eventId: platformData.events[1].id },
      "en",
    ),
    [],
  );

  const productForum = platformData.events[1];
  assert.deepEqual(
    filterActivity(getMockActivityData(productForum), noFilters, "en"),
    filterActivity(
      platformData,
      { ...noFilters, eventId: productForum.id },
      "en",
    ),
  );
});

test("mock results combine action, actor, event, month and localized text filters", () => {
  const data = getMockActivityData();
  const filters = {
    search: "  วันปิดรับคำตอบ  ",
    eventId: "book-expo-2026",
    action: "edit",
    month: "2026-11",
    actorId: "pimchanok",
  };
  const translate = (key) =>
    key === "fields.responseDeadline" ? "วันปิดรับคำตอบ" : key;
  const matches = filterActivity(data, filters, "th", translate);

  assert.deepEqual(
    matches.map(({ id }) => id),
    ["activity-survey-deadline"],
  );
  assert.deepEqual(
    filterActivity(data, { ...filters, action: "add" }, "th", translate),
    [],
  );
  assert.deepEqual(getActivitySummary([]), {
    total: 0,
    eventCount: 0,
    actorCount: 0,
    edit: 0,
    add: 0,
    delete: 0,
  });
  const englishNames = filterActivity(
    data,
    { ...noFilters, search: " PIMCHANOK " },
    "en",
  );
  const thaiNames = filterActivity(
    data,
    { ...noFilters, search: " พิมพ์ชนก " },
    "en",
  );
  assert.ok(englishNames.length > 0);
  assert.ok(
    englishNames.every(({ actorUserId }) => actorUserId === "pimchanok"),
  );
  assert.deepEqual(thaiNames, englishNames);
});

test("month filters use midnight in Asia/Bangkok", () => {
  const data = getMockActivityData();
  const sample = data.records[0];
  const boundary = {
    ...data,
    records: [
      { ...sample, id: "october", occurredAt: "2026-10-31T16:59:59Z" },
      { ...sample, id: "november", occurredAt: "2026-10-31T17:00:00Z" },
    ],
  };

  assert.deepEqual(
    filterActivity(boundary, { ...noFilters, month: "2026-11" }, "th").map(
      ({ id }) => id,
    ),
    ["november"],
  );
  assert.deepEqual(
    filterActivity(boundary, { ...noFilters, month: "2026-10" }, "en").map(
      ({ id }) => id,
    ),
    ["october"],
  );
});
