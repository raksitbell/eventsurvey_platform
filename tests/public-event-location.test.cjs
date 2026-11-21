/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node tests load TypeScript through the local harness. */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const { loadSource } = require("./support/load-source.cjs");

function fixture(translations) {
  const event = {
    id: "legacy-event",
    slug: "legacy-expo",
    status: "open",
    default_locale: "th",
    has_registration: false,
    has_survey: false,
    is_private: false,
    survey_access: null,
    start_at: "2026-11-01T00:00:00.000Z",
    end_at: "2026-11-02T00:00:00.000Z",
    deleted_at: null,
  };

  const load = loadSource({
    "@/core/api/mock-client": {
      MockApiError: class MockApiError extends Error {
        constructor(message, status) {
          super(message);
          this.status = status;
        }
      },
      mockApi: {
        async getFresh(path) {
          assert.ok(path.startsWith("/events?"));
          return [event];
        },
        async get(path) {
          if (path.startsWith("/event_translations?")) return translations;
          if (path.startsWith("/event_banners?")) return [];
          if (path.startsWith("/forms?")) return [];
          throw new Error(`Unexpected path ${path}`);
        },
      },
    },
    "@/core/event/setup-storage": {
      readSetupRecord: () => ({ publication: null, publishedBranding: null }),
    },
  });

  return {
    getPublicEventBySlug: load("src/services/event/public-event.ts")
      .getPublicEventBySlug,
  };
}

test("legacy public event uses floor_zone for locationDetail, not address_text", async () => {
  const env = fixture([
    {
      event_id: "legacy-event",
      locale_code: "th",
      title: "งานเลกาซี",
      description: null,
      location_name: "ศูนย์ประชุม",
      floor_zone: "ชั้น 3 โซน A",
      address_text: "ถนนตัวอย่าง 100",
    },
    {
      event_id: "legacy-event",
      locale_code: "en",
      title: "Legacy Expo",
      description: null,
      location_name: "Convention Center",
      floor_zone: "Floor 3 Zone A",
      address_text: "100 Example Road",
    },
  ]);

  const th = await env.getPublicEventBySlug("legacy-expo", "th");
  const en = await env.getPublicEventBySlug("legacy-expo", "th", "en");
  const missing = await env.getPublicEventBySlug("legacy-expo", "en", "ja");

  assert.equal(th.draft.locationDetail, "ชั้น 3 โซน A");
  assert.equal(en.draft.locationDetail, "Floor 3 Zone A");
  assert.equal(missing.draft.locationDetail, "ชั้น 3 โซน A");
});

test("legacy public event leaves locationDetail empty when floor_zone is missing", async () => {
  const env = fixture([
    {
      event_id: "legacy-event",
      locale_code: "th",
      title: "งานเลกาซี",
      description: null,
      location_name: "ศูนย์ประชุม",
      floor_zone: null,
      address_text: "ถนนตัวอย่าง 100",
    },
  ]);

  const page = await env.getPublicEventBySlug("legacy-expo", "th");
  assert.equal(page.draft.locationDetail, undefined);
});
