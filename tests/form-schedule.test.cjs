/* eslint-disable @typescript-eslint/no-require-imports -- The Node test harness loads the TypeScript service. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { test } = require("node:test");
const { loadSource } = require("./support/load-source.cjs");

test("the form service rejects new past dates and invalid merged windows while preserving saved schedules", async (t) => {
  const cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), "event-form-schedule-"));
  t.after(() => fs.rmSync(cacheDir, { recursive: true, force: true }));
  const now = Date.now();
  const past = new Date(now - 3_600_000).toISOString();
  const recent = new Date(now - 1_800_000).toISOString();
  const future = new Date(now + 3_600_000).toISOString();
  const form = {
    id: "test-form",
    event_id: "test-event",
    type: "survey",
    status: "draft",
    opens_at: past,
    closes_at: future,
  };
  const writes = [];
  const load = loadSource({
    "node:os": { tmpdir: () => cacheDir },
    "@/core/api/mock-client": {
      mockApi: {
        async get(resource) {
          if (resource === `/forms/${form.id}`) return { ...form };
          if (resource === `/events/${form.event_id}`) return { id: form.event_id };
          if (resource.includes("?")) return [];
          throw new Error(`Unexpected read ${resource}`);
        },
        async put(resource, body) {
          assert.equal(resource, `/forms/${form.id}`);
          writes.push(body);
          return body;
        },
      },
    },
  });
  const { createForm, updateForm, updateFormStatus } = load("src/services/event/forms.ts");
  const input = { eventId: form.event_id, type: form.type, questions: [] };
  await assert.rejects(createForm({ ...input, opens_at: past }, "owner"), {
    code: "FORM_SCHEDULE_IN_PAST",
  });
  await assert.rejects(updateForm(form.id, { ...input, closes_at: recent }, "owner"), {
    code: "FORM_SCHEDULE_IN_PAST",
  });
  await assert.rejects(updateFormStatus(form.id, { status: "scheduled" }, "owner"), {
    code: "FORM_SCHEDULE_IN_PAST",
  });
  await assert.rejects(updateFormStatus(form.id, { status: "scheduled", opensAt: future }, "owner"), {
    code: "DATE_RANGE_INVALID",
  });
  assert.deepEqual(writes, []);

  form.status = "scheduled";
  const reverted = await updateFormStatus(form.id, { status: "draft" }, "owner");
  assert.equal(reverted.status, "draft");
  assert.equal(reverted.opensAt, past);
  assert.equal(reverted.closesAt, future);
  assert.equal(writes.length, 1);
});
