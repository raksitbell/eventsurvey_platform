/* eslint-disable @typescript-eslint/no-require-imports -- Standalone harness matches published dashboard tests; no new test dependency. */
// Run: node --test tests/event-setup.cjs
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const { loadSource } = require("./support/load-source.cjs");
const root = path.resolve(__dirname, "..");
const cache = new Map();
function load(relative) {
  const filename = path.join(root, relative);
  if (cache.has(filename)) return cache.get(filename);
  const mod = { exports: {} };
  cache.set(filename, mod.exports);
  const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  new Function("require", "exports", source)(
    (name) =>
      name.startsWith("@/") ? load(`src/${name.slice(2)}.ts`) : require(name),
    mod.exports,
  );
  return mod.exports;
}
const { normalizeEventAccess } = load("src/core/event/access.ts");
const { eventDraftKey, eventDraftV2Key, eventDraftSchema, restoreEventDraft } =
  load("src/core/event/draft.ts");
const {
  emptyEventTranslation,
  eventContentSchema,
  getEventContent,
  normalizeContentLocale,
  projectEventContent,
  resolveEventTranslation,
} = load("src/core/event/content.ts");
const { fromBangkokInput, toBangkokInput } = load(
  "src/core/i18n/bangkok-datetime.ts",
);
const seed = {
  eventId: "event-a",
  eventName: "Event",
  description: null,
  locationName: null,
  startsAt: null,
  endsAt: null,
  isPrivate: false,
  hasRegistration: true,
  hasSurvey: true,
  surveyAccess: "registered_only",
  eventStatus: "draft",
  canEditEvent: true,
};
function storage(t) {
  const old = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const values = new Map();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    writable: true,
    value: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    },
  });
  t.after(() => {
    if (old === undefined) delete globalThis.localStorage;
    else Object.defineProperty(globalThis, "localStorage", old);
  });
  return values;
}
test("Registration off resets Required, and re-enabling does not silently restore it", () => {
  for (const isPrivate of [false, true]) {
    const off = normalizeEventAccess({
      ...seed,
      isPrivate,
      hasRegistration: false,
    });
    assert.equal(off.surveyAccess, "public");
    assert.equal(off.isPrivate, isPrivate);
    assert.equal(
      normalizeEventAccess({ ...off, hasRegistration: true }).surveyAccess,
      "public",
    );
  }
});
test("Survey off/on resets access and preserves configured limits", () => {
  const off = normalizeEventAccess({
    ...seed,
    hasSurvey: false,
    registrationCapacity: 200,
  });
  assert.equal(off.surveyAccess, null);
  const on = normalizeEventAccess({ ...off, hasSurvey: true });
  assert.equal(on.surveyAccess, "public");
  assert.equal(on.registrationCapacity, 200);
});
test("restored drafts cannot retain Required without Registration", () => {
  const parsed = eventDraftSchema.parse({ ...seed, hasRegistration: false });
  assert.equal(parsed.surveyAccess, "public");
});
test("save is immediately visible and scoped to user, event and locale", (t) => {
  storage(t);
  const key = eventDraftKey("owner", seed.eventId, "th");
  assert.equal(saveEventDraft(key, { ...seed, eventName: "Edited" }), "saved");
  assert.equal(restoreEventDraft(seed, "owner", "th").eventName, "Edited");
  assert.equal(
    restoreEventDraft(seed, "someone-else", "th").eventName,
    "Event",
  );
  assert.equal(restoreEventDraft(seed, "owner", "en").eventName, "Event");
  assert.equal(
    restoreEventDraft({ ...seed, eventId: "other" }, "owner", "th").eventName,
    "Event",
  );
});
test("invalid schedules and storage failures report failure without replacing the valid save", (t) => {
  const values = storage(t),
    key = eventDraftKey("owner", seed.eventId, "th");
  saveEventDraft(key, seed);
  const original = values.get(key);
  assert.equal(
    saveEventDraft(key, {
      ...seed,
      startsAt: "2026-11-09T03:00:00Z",
      endsAt: "2026-11-09T02:00:00Z",
    }),
    "invalid",
  );
  assert.equal(values.get(key), original);
  globalThis.localStorage.setItem = () => {
    throw new Error("quota");
  };
  assert.equal(saveEventDraft(key, seed), "error");
});
test("closed/read-only workspaces and malformed storage do not apply draft overrides", (t) => {
  const values = storage(t),
    key = eventDraftKey("owner", seed.eventId, "th");
  saveEventDraft(key, { ...seed, eventName: "Edited" });
  for (const eventStatus of ["open", "scheduled", "closed"])
    assert.equal(
      restoreEventDraft({ ...seed, eventStatus }, "owner", "th").eventName,
      "Event",
    );
  assert.equal(
    restoreEventDraft({ ...seed, canEditEvent: false }, "owner", "th")
      .eventName,
    "Event",
  );
  values.set(key, "{broken");
  assert.equal(restoreEventDraft(seed, "owner", "th").eventName, "Event");
});
test("capacity accepts unlimited and positive integers, rejects invalid limits", () => {
  for (const registrationCapacity of [null, 1, 200])
    assert(
      eventDraftSchema.safeParse({ ...seed, registrationCapacity }).success,
    );
  for (const registrationCapacity of [0, -1, 1.5, NaN])
    assert(
      !eventDraftSchema.safeParse({ ...seed, registrationCapacity }).success,
    );
});
test("Bangkok conversion round-trips midnight, leap days and invalid dates", () => {
  for (const value of [
    "2026-11-09T00:00",
    "2024-02-29T23:59",
    "2027-03-14T02:30",
    "2026-11-09T09:30",
  ])
    assert.equal(toBangkokInput(fromBangkokInput(value)), value);
  assert.equal(
    fromBangkokInput("2026-11-09T09:30"),
    "2026-11-09T02:30:00.000Z",
  );
  for (const value of ["", "bad", "2026-02-30T09:30", "2026-11-09T24:00"])
    assert.equal(fromBangkokInput(value), null);
});
test("form labels and translation keys match across locales", () => {
  const th = JSON.parse(
      fs.readFileSync(path.join(root, "src/messages/th.json")),
    ),
    en = JSON.parse(fs.readFileSync(path.join(root, "src/messages/en.json")));
  const keys = (obj) =>
    Object.entries(obj)
      .flatMap(([key, value]) =>
        typeof value === "object"
          ? keys(value).map((child) => `${key}.${child}`)
          : [key],
      )
      .sort();
  assert.deepEqual(keys(th.eventHome), keys(en.eventHome));
  assert.equal(th.eventHome.registrationForm, "ฟอร์มลงทะเบียน");
  assert.equal(en.eventHome.registrationForm, "Registration Form");
  assert.equal(th.eventHome.surveyForm, "ฟอร์มแบบสอบถาม");
  assert.equal(en.eventHome.surveyForm, "Survey Form");
});

test("workspace binding returns localized safe DTOs and only active assistants", async (t) => {
  const { mockApi } = load("src/core/api/mock-client.ts");
  const original = mockApi.get;
  t.after(() => {
    mockApi.get = original;
  });
  const users = [
    {
      id: "owner",
      system_role: "event_user",
      event_id: "event-a",
      role_id: "owner-role",
      status: "active",
      password: "secret-owner",
      display_name: "Owner",
    },
    {
      id: "assistant",
      system_role: "event_user",
      event_id: "event-a",
      role_id: "assistant-role",
      status: "active",
      password: "secret-assistant",
      display_name: "Assistant",
    },
    {
      id: "removed",
      system_role: "event_user",
      event_id: "event-a",
      role_id: "assistant-role",
      status: "active",
      removed_at: "2026-11-01",
      display_name: "Removed",
    },
    {
      id: "unassigned",
      system_role: "event_user",
      event_id: null,
      role_id: null,
      status: "active",
      display_name: "No event",
    },
  ];
  let status = "draft";
  mockApi.get = async (query) => {
    const url = new URL(query, "https://fixture.invalid");
    if (url.pathname.startsWith("/users/"))
      return users.find(
        (user) => user.id === decodeURIComponent(url.pathname.slice(7)),
      );
    if (url.pathname === "/event_access") {
      const all = [
        {
          id: "access-owner",
          user_id: "owner",
          event_id: "event-a",
          role_name: "Event Admin",
          can_manage_sub_users: true,
          matrix: {
            event: "can_edit",
            registrationForm: "can_edit",
            surveyForm: "can_edit",
            dashboard: "can_edit",
            canViewSubmissions: true,
            canManageSubmissions: true,
            canExport: true,
          },
          deleted_at: null,
        },
        {
          id: "access-assistant",
          user_id: "assistant",
          event_id: "event-a",
          role_name: "Assistant role",
          can_manage_sub_users: false,
          matrix: {
            event: "view_only",
            registrationForm: "view_only",
            surveyForm: "view_only",
            dashboard: "restricted",
            canViewSubmissions: false,
            canManageSubmissions: false,
            canExport: false,
          },
          deleted_at: null,
        },
      ];
      const userId = url.searchParams.get("user_id");
      const eventId = url.searchParams.get("event_id");
      return all.filter(
        (row) =>
          (!userId || row.user_id === userId) &&
          (!eventId || row.event_id === eventId),
      );
    }
    if (url.pathname === "/events/event-a")
      return {
        id: "event-a",
        slug: "event",
        default_locale: "TH",
        status,
        start_at: "2026-11-09T02:00:00Z",
        end_at: "2026-11-09T10:00:00Z",
        is_private: true,
        has_registration: true,
        has_survey: true,
        survey_access: "registered_only",
      };
    if (url.pathname === "/event_translations")
      return [
        {
          event_id: "event-a",
          locale_code: "th",
          display_order: 1,
          title: "กิจกรรม",
          description: "รายละเอียด",
          location_name: "กรุงเทพ",
        },
        {
          event_id: "event-a",
          locale_code: "en",
          display_order: 3,
          title: "Event",
          description: "Description",
          location_name: "Bangkok",
        },
        {
          event_id: "event-a",
          locale_code: "FR",
          display_order: 2,
          title: "Salon",
          description: null,
          location_name: "Bangkok",
          floor_zone: "2e étage",
        },
      ];
    if (url.pathname === "/users")
      return [
        ...users,
        { ...users[1], id: "off-scope", event_id: "event-b", display_name: "Other" },
      ];
    if (url.pathname === "/event_banners") return [];
    if (url.pathname === "/event_form_settings")
      return [
        { event_id: "event-b", form_type: "registration", capacity: 99 },
        { event_id: "event-a", form_type: "registration", is_unlimited: false, capacity: 200 },
      ];
    throw new Error(`Unexpected fixture query: ${query}`);
  };
  const { getEventWorkspace } = load("src/services/event/workspace.ts");
  const workspace = await getEventWorkspace("owner", "th");
  assert.equal(workspace.eventName, "กิจกรรม");
  assert.equal(workspace.content.defaultLocale, "th");
  assert.deepEqual(
    workspace.content.translations.map(({ localeCode }) => localeCode),
    ["th", "fr", "en"],
  );
  assert.equal(workspace.content.translations[1].floorZone, "2e étage");
  assert.equal(workspace.registrationCapacity, 200);
  assert.equal(workspace.canEditEvent, true);
  assert.equal(workspace.canAccessDashboard, false);
  assert.equal(workspace.canAccessForms, true);
  assert.deepEqual(workspace.subUsers, [
    { id: "assistant", name: "Assistant" },
  ]);
  assert.equal(workspace.subUserCount, 1);
  assert(!JSON.stringify(workspace).includes("secret-"));
  const assistant = await getEventWorkspace("assistant", "en");
  assert.equal(assistant.eventName, "Event");
  assert.equal(assistant.canEditEvent, false);
  assert.equal(assistant.canAccessForms, true);
  assert.deepEqual(assistant.subUsers, []);
  assert.equal(await getEventWorkspace("unassigned", "th"), null);
  status = "open";
  assert.equal((await getEventWorkspace("owner", "en")).canAccessDashboard, true);
  assert.equal((await getEventWorkspace("assistant", "en")).canAccessDashboard, false);
});

const {
  defaultEventBranding,
  eventBrandingEditSchema,
  eventBrandingKey,
  eventBrandingSchema,
  loadEventBranding,
} = load("src/core/event/branding.ts");
test("branding saves are scoped and reject invalid colors or external media URLs", (t) => {
  storage(t);
  const key = eventBrandingKey("owner", "event-a", "th");
  const value = {
    ...defaultEventBranding,
    primary: "#123ABC",
    logo: { name: "logo.png", url: "data:image/png;base64,aGVsbG8=" },
  };
  assert.equal(saveEventBranding(key, value), "saved");
  assert.deepEqual(loadEventBranding(key), value);
  for (const other of [
    eventBrandingKey("other", "event-a", "th"),
    eventBrandingKey("owner", "other", "th"),
    eventBrandingKey("owner", "event-a", "en"),
  ])
    assert.deepEqual(loadEventBranding(other), defaultEventBranding);
  assert(!eventBrandingSchema.safeParse({ ...value, primary: "red" }).success);
  assert(
    !eventBrandingSchema.safeParse({
      ...value,
      logo: { name: "logo", url: "https://example.com/logo.png" },
    }).success,
  );
  assert.equal(saveEventBranding(key, { ...value, accent: "bad" }), "invalid");
  assert.deepEqual(loadEventBranding(key), value);
});
test("branding storage failures and corrupt saved data are handled", (t) => {
  const values = storage(t),
    key = eventBrandingKey("owner", "event-a", "th");
  values.set(key, "{bad");
  assert.deepEqual(loadEventBranding(key), defaultEventBranding);
  values.set(key, JSON.stringify({ primary: "bad" }));
  assert.deepEqual(loadEventBranding(key), defaultEventBranding);
  globalThis.localStorage.setItem = () => {
    throw new Error("quota");
  };
  assert.equal(saveEventBranding(key, defaultEventBranding), "error");
});
test("Setup keeps a failed replacement local and clears it only after an accepted upload", async (t) => {
  const values = storage(t);
  const oldUrl = "/api/event/setup/media/11111111-1111-4111-8111-111111111111";
  const newUrl = "/api/event/setup/media/22222222-2222-4222-8222-222222222222";
  let uploadAvailable = false;
  let attempts = 0;
  const {
    applySetupLocalMedia,
    clearUnneededSetupLocalMedia,
    prepareSetupBranding,
    setupLocalMediaKey,
  } = loadSource({
    "@/core/api": {
      api: {
        async postForm(route, body) {
          assert.equal(route, "/event/setup/media");
          assert.equal(body.get("eventId"), "event-a");
          assert.equal(body.get("file").type, "image/png");
          attempts++;
          if (!uploadAvailable) throw new Error("storage unavailable");
          return { url: newUrl };
        },
      },
    },
  })("src/core/event/setup-media-local.ts");
  const key = setupLocalMediaKey("owner", "event-a", "th");
  const other = setupLocalMediaKey("owner", "event-a", "en");
  const stored = {
    ...defaultEventBranding,
    banner: { name: "old.png", url: oldUrl, cropPosition: 25 },
  };
  const image = { name: "new.png", url: "data:image/png;base64,AA==", cropPosition: 70 };
  const edited = { ...stored, primary: "#123456", banner: image };
  const rejected = await prepareSetupBranding(edited, stored, [], new Set(["banner"]), key, "event-a");
  assert.deepEqual(rejected.pendingMedia, ["banner"]);
  assert.deepEqual(rejected.value.banner, stored.banner);
  assert.equal(rejected.value.primary, "#123456");
  assert.deepEqual(applySetupLocalMedia(rejected.value, key, rejected.pendingMedia).banner, image);
  assert.deepEqual(applySetupLocalMedia(rejected.value, other, rejected.pendingMedia).banner, stored.banner);
  assert.deepEqual(Object.keys(JSON.parse(values.get(key))), ["banner"]);

  const fromAnotherBrowser = await prepareSetupBranding(rejected.value, stored, ["banner"], new Set(), other, "event-a");
  assert.deepEqual(fromAnotherBrowser.pendingMedia, ["banner"]);
  const discarded = await prepareSetupBranding(rejected.value, stored, ["banner"], new Set(["banner"]), other, "event-a");
  assert.deepEqual(discarded.pendingMedia, []);
  assert.deepEqual(discarded.value.banner, stored.banner);
  assert.equal(attempts, 1);
  uploadAvailable = true;
  const accepted = await prepareSetupBranding(edited, stored, ["banner"], new Set(), key, "event-a");
  assert.deepEqual(accepted.pendingMedia, []);
  assert.deepEqual(accepted.value.banner, { ...image, url: newUrl });
  assert.ok(values.has(key));
  clearUnneededSetupLocalMedia(key, accepted.pendingMedia);
  assert.ok(!values.has(key));
});
test("a successful same-tab save advances only local edits from its revision", async () => {
  const cells = [];
  let cursor = 0;
  let serverRevision = 2;
  const received = [];
  class ApiError extends Error {
    code = "SETUP_CONFLICT";
  }
  const useSetupApiState = loadSource({
    react: {
      useRef(initial) {
        const index = cursor++;
        return cells[index] ??= { current: initial };
      },
      useState(initial) {
        const index = cursor++;
        return [cells[index] ??= initial, (value) => { cells[index] = value; }];
      },
    },
    "@/core/api": {
      ApiError,
      api: {
        async patch(_url, body) {
          received.push(body.revision);
          if (serverRevision !== body.revision) throw new ApiError();
          return { revision: ++serverRevision, savedFromRevision: body.revision };
        },
      },
    },
  })("src/hooks/useSetupApiState.ts").default;
  const render = (revision) => {
    cursor = 0;
    return useSetupApiState({ ...seed, setup: { revision } });
  };
  const staleRevision = render(1).getRevision();
  const current = render(2);
  const freshRevision = current.getRevision();
  assert.equal((await current.save({ draft: seed }, freshRevision)).revision, 3);
  assert.equal(await current.save({ draft: seed }, staleRevision), null);
  assert.equal(render(3).conflict, true);
  assert.equal((await current.save({ draft: seed }, freshRevision)).revision, 4);
  assert.deepEqual(received, [2, 1, 3]);
});
const {
  IMAGE_MAX_INPUT_BYTES,
  imageUploadError,
  fitImageDimensions,
  prepareBrandingImage,
  IMAGE_MAX_LOCAL_BYTES,
  rasterizeBrandingSvg,
} = load("src/utils/image-upload.ts");
test("image uploads accept shared PNG/JPG and supported types strictly below 10 MiB", () => {
  for (const type of [
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/avif",
    "image/gif",
    "image/bmp",
    "image/svg+xml",
  ])
    assert.equal(
      imageUploadError({ type, size: IMAGE_MAX_INPUT_BYTES - 1 }),
      null,
    );
  for (const size of [0, IMAGE_MAX_INPUT_BYTES, IMAGE_MAX_INPUT_BYTES + 1])
    assert.equal(imageUploadError({ type: "image/png", size }), "fileSize");
  assert.equal(
    imageUploadError({ type: "application/pdf", size: 20 }),
    "fileType",
  );
});
test("image resize preserves portrait/landscape aspect and never upscales", () => {
  assert.deepEqual(fitImageDimensions(3000, 4000, 1600, 1600), {
    width: 1200,
    height: 1600,
  });
  assert.deepEqual(fitImageDimensions(4000, 3000, 1600, 1600), {
    width: 1600,
    height: 1200,
  });
  assert.deepEqual(fitImageDimensions(120, 80, 512, 512), {
    width: 120,
    height: 80,
  });
  assert.throws(() => fitImageDimensions(0, 100, 512, 512), {
    code: "fileRead",
  });
});
function imageBrowser(t, options = {}) {
  const calls = {
    bitmaps: 0,
    closed: 0,
    alpha: null,
    draws: [],
    encodes: [],
    revoked: [],
    urls: [],
    imageCleared: false,
  };
  const patch = (object, key, value) => {
    const descriptor = Object.getOwnPropertyDescriptor(object, key);
    Object.defineProperty(object, key, {
      configurable: true,
      writable: true,
      value,
    });
    t.after(() =>
      descriptor
        ? Object.defineProperty(object, key, descriptor)
        : delete object[key],
    );
  };
  const canvas = {
    width: 0,
    height: 0,
    getContext: (_, settings) => {
      calls.alpha = settings;
      return {
        drawImage: (...args) => calls.draws.push(args.slice(1)),
        imageSmoothingEnabled: false,
        imageSmoothingQuality: "low",
      };
    },
    toBlob: (callback, type, quality) => {
      calls.encodes.push({
        type,
        quality,
        width: canvas.width,
        height: canvas.height,
      });
      const size =
        options.sizes?.[
          Math.min(calls.encodes.length - 1, options.sizes.length - 1)
        ] ?? 60;
      queueMicrotask(() =>
        callback(
          options.nullBlob
            ? null
            : new Blob([new Uint8Array(size)], {
                type: options.outputType ?? type,
              }),
        ),
      );
    },
  };
  patch(globalThis, "document", { createElement: () => canvas });
  patch(globalThis, "createImageBitmap", async (_, settings) => {
    calls.bitmaps++;
    calls.orientation = settings.imageOrientation;
    if (options.bitmapError) throw Error("Unsupported bitmap");
    if (options.abortOnDecode) options.abortOnDecode.abort();
    return {
      width: options.width ?? 3000,
      height: options.height ?? 4000,
      close: () => calls.closed++,
    };
  });
  patch(
    globalThis,
    "Image",
    class {
      naturalWidth = options.width ?? 3000;
      naturalHeight = options.height ?? 4000;
      set src(value) {
        if (!value) {
          calls.imageCleared = true;
          return;
        }
        queueMicrotask(() =>
          options.decodeError ? this.onerror?.() : this.onload?.(),
        );
      }
    },
  );
  patch(URL, "createObjectURL", () => {
    const url = `blob:test-${calls.urls.length}`;
    calls.urls.push(url);
    return url;
  });
  patch(URL, "revokeObjectURL", (url) => calls.revoked.push(url));
  patch(
    globalThis,
    "FileReader",
    class {
      aborted = false;
      readAsDataURL(blob) {
        blob.arrayBuffer().then((buffer) => {
          if (this.aborted) return;
          this.result = `data:${blob.type};base64,${Buffer.from(buffer).toString("base64")}`;
          this.onload?.();
        });
      }
      abort() {
        this.aborted = true;
        this.onabort?.();
      }
    },
  );
  return { calls, canvas };
}
test("small supported images keep their exact bytes, filename and type without encoding", async (t) => {
  const { calls } = imageBrowser(t);
  for (const [type, ext] of [
    ["image/png", "png"],
    ["image/jpeg", "jpg"],
    ["image/webp", "webp"],
    ["image/avif", "avif"],
    ["image/gif", "gif"],
    ["image/bmp", "bmp"],
    ["image/svg+xml", "svg"],
  ]) {
    const name = `source.${ext}`;
    assert.deepEqual(
      await prepareBrandingImage(new File(["original"], name, { type })),
      { name, url: `data:${type};base64,b3JpZ2luYWw=` },
    );
  }
  assert.equal(calls.orientation, "from-image");
  assert.equal(calls.encodes.length, 0);
  assert.equal(calls.closed, 7);
});
test("an optimized JPEG keeps its type, reducing quality then dimensions", async (t) => {
  const { calls, canvas } = imageBrowser(t, {
    sizes: [450000, 430000, 400000, 270000],
  });
  const input = new File([new Uint8Array(500000)], "banner.JPG", {
    type: "image/jpeg",
  });
  const result = await prepareBrandingImage(input, { maxDimension: 1600 });
  assert.equal(result.name, input.name);
  assert.match(result.url, /^data:image\/jpeg;base64,/);
  assert.equal(Buffer.from(result.url.split(",")[1], "base64").length, 270000);
  assert.equal(calls.encodes.length, 4);
  assert.ok(calls.encodes[1].quality < calls.encodes[0].quality);
  assert.ok(calls.encodes[3].width < calls.encodes[0].width);
  assert.ok(calls.encodes.every((item) => item.type === input.type));
  assert.deepEqual(calls.draws[0], [0, 0, 1200, 1600]);
  assert.equal(calls.closed, 1);
  assert.deepEqual([canvas.width, canvas.height], [0, 0]);
});
test("PNG optimization retains alpha and resizes the full image without baking the crop", async (t) => {
  const { calls } = imageBrowser(t, { width: 2400, height: 1600 });
  const image = await prepareBrandingImage(
    new File([new Uint8Array(500000)], "banner.png", { type: "image/png" }),
    { minimumSize: { width: 1920, height: 1080 } },
  );
  assert.match(image.url, /^data:image\/png;base64,/);
  assert.deepEqual(calls.alpha, { alpha: true });
  assert.deepEqual(calls.draws[0], [0, 0, 2400, 1600]);
  await assert.rejects(
    prepareBrandingImage(
      new File(["original"], "banner.png", { type: "image/png" }),
      {
        minimumSize: { width: 2401, height: 1600 },
      },
    ),
    { code: "cropSize" },
  );
});
test("a banner above the browser limit can be staged and uploaded at the required resolution", async (t) => {
  const values = storage(t);
  const optimizedBytes = IMAGE_MAX_LOCAL_BYTES + 256 * 1024;
  const { calls } = imageBrowser(t, {
    width: 2400,
    height: 1350,
    sizes: [optimizedBytes],
  });
  const image = await prepareBrandingImage(
    new File([new Uint8Array(2 * IMAGE_MAX_LOCAL_BYTES)], "banner.png", {
      type: "image/png",
    }),
    { minimumSize: { width: 1920, height: 1080 } },
  );
  assert.deepEqual(
    calls.encodes.map(({ width, height }) => [width, height]),
    [
      [2400, 1350],
      [1920, 1080],
    ],
  );
  const url = "/api/event/setup/media/22222222-2222-4222-8222-222222222222";
  let online = false;
  const uploads = [];
  const { prepareSetupBranding, setupLocalMediaKey } = loadSource({
    "@/core/api": {
      api: {
        async postForm(_route, body) {
          const file = body.get("file");
          uploads.push([file.type, file.size]);
          if (!online) throw new Error("storage unavailable");
          return { url };
        },
      },
    },
  })("src/core/event/setup-media-local.ts");
  const key = setupLocalMediaKey("owner", "event-a", "th");
  const oldBanner = { name: "old.png", url: "data:image/png;base64,AA==" };
  values.set(key, JSON.stringify({ banner: oldBanner }));
  const stored = { ...defaultEventBranding, banner: { name: "saved.png", url } };
  const staged = {
    ...stored,
    logo: { name: "small.png", url: oldBanner.url },
    banner: { ...image, cropPosition: 75 },
  };
  const edit = eventBrandingEditSchema.parse(staged);
  assert.equal(eventBrandingSchema.safeParse(edit).success, false);
  const fields = new Set(["logo", "banner"]);
  await assert.rejects(
    prepareSetupBranding(edit, stored, ["banner"], fields, key, "event-a"),
    { code: "fileOutputSize" },
  );
  assert.deepEqual(JSON.parse(values.get(key)), { banner: oldBanner });

  online = true;
  const accepted = await prepareSetupBranding(edit, stored, ["banner"], fields, key, "event-a");
  assert.deepEqual(uploads, [
    ["image/png", 1], ["image/png", optimizedBytes],
    ["image/png", 1], ["image/png", optimizedBytes],
  ]);
  assert.deepEqual(accepted.pendingMedia, []);
  assert.deepEqual(accepted.value.banner, { name: "banner.png", url, cropPosition: 75 });
  assert.equal(eventBrandingSchema.safeParse(accepted.value).success, true);
});
test("a tall PNG can shrink while meeting the landscape banner resolution", async (t) => {
  const { calls } = imageBrowser(t, { width: 2400, height: 4800 });
  const result = await prepareBrandingImage(
    new File([new Uint8Array(2 * IMAGE_MAX_LOCAL_BYTES)], "banner.png", {
      type: "image/png",
    }),
    { minimumSize: { width: 1920, height: 1080 } },
  );

  assert.deepEqual(calls.draws, [[0, 0, 1920, 3840]]);
  assert.match(result.url, /^data:image\/png;base64,/);
  assert.equal(Buffer.from(result.url.split(",")[1], "base64").length, 60);
});
test("an oversized JPEG can lower quality when its banner dimensions cannot shrink further", async (t) => {
  const { calls } = imageBrowser(t, {
    width: 1920,
    height: 1080,
    sizes: [
      IMAGE_MAX_LOCAL_BYTES + 100,
      IMAGE_MAX_LOCAL_BYTES + 50,
      IMAGE_MAX_LOCAL_BYTES + 1,
      IMAGE_MAX_LOCAL_BYTES,
    ],
  });
  const result = await prepareBrandingImage(
    new File([new Uint8Array(2 * IMAGE_MAX_LOCAL_BYTES)], "banner.jpg", {
      type: "image/jpeg",
    }),
    { minimumSize: { width: 1920, height: 1080 } },
  );

  assert.deepEqual(calls.draws, [[0, 0, 1920, 1080]]);
  assert.ok(calls.encodes.at(-1).quality < calls.encodes.at(-2).quality);
  assert.match(result.url, /^data:image\/jpeg;base64,/);
  assert.equal(
    Buffer.from(result.url.split(",")[1], "base64").length,
    IMAGE_MAX_LOCAL_BYTES,
  );
});
test("optimization ignores mismatched MIME and keeps original raster bytes for upload", async (t) => {
  const { calls } = imageBrowser(t, { outputType: "image/png" });
  const file = new File([new Uint8Array(450000)], "logo.jpg", {
    type: "image/jpeg",
  });
  const result = await prepareBrandingImage(file);
  assert.equal(result.name, file.name);
  assert.match(result.url, /^data:image\/jpeg;base64,/);
  assert.equal(
    Buffer.from(result.url.split(",")[1], "base64").length,
    file.size,
  );
  for (const type of ["image/jpeg", "image/webp"]) {
    const original = await prepareBrandingImage(
      new File([new Uint8Array(IMAGE_MAX_LOCAL_BYTES + 1)], "original", { type }),
    );
    assert.ok(original.url.startsWith(`data:${type};base64,`));
    assert.equal(Buffer.from(original.url.split(",")[1], "base64").length, IMAGE_MAX_LOCAL_BYTES + 1);
  }
  assert.equal(calls.encodes.length, 2);
  assert.equal(calls.closed, 3);
});
test("cancelled preparation cannot return a result and closes its decoded bitmap", async (t) => {
  const controller = new AbortController();
  const { calls } = imageBrowser(t, { abortOnDecode: controller });
  await assert.rejects(
    prepareBrandingImage(
      new File(["input"], "logo.png", { type: "image/png" }),
      {
        signal: controller.signal,
      },
    ),
    { code: "aborted" },
  );
  assert.equal(calls.closed, 1);
  assert.equal(calls.encodes.length, 0);
});
test("SVG/browser decoder fallback saves the SVG and revokes its object URL", async (t) => {
  const { calls } = imageBrowser(t, { bitmapError: true });
  const result = await prepareBrandingImage(
    new File(["input"], "logo.svg", { type: "image/svg+xml" }),
  );
  assert.equal(result.name, "logo.svg");
  assert.match(result.url, /^data:image\/svg\+xml;base64,/);
  assert.deepEqual(calls.revoked, calls.urls);
  assert.equal(calls.imageCleared, true);
});
test("a captured SVG is rasterized through the image element within the upload limits", async (t) => {
  const { calls, canvas } = imageBrowser(t, {
    width: 1600,
    height: 800,
    sizes: [IMAGE_MAX_LOCAL_BYTES + 1],
  });
  const file = new File(
    ["<svg><!--", " ".repeat(IMAGE_MAX_LOCAL_BYTES), "--></svg>"],
    "wordmark.SVG",
    { type: "image/svg+xml" },
  );
  const png = await rasterizeBrandingSvg(file, { maxDimension: 512 });

  assert.equal(png.type, "image/png");
  assert.equal(png.name, "wordmark.png");
  assert.equal(png.size, IMAGE_MAX_LOCAL_BYTES + 1);
  assert.equal(calls.bitmaps, 0);
  assert.deepEqual(calls.alpha, { alpha: true });
  assert.deepEqual(calls.draws[0], [0, 0, 512, 256]);
  assert.deepEqual(calls.revoked, calls.urls);
  assert.equal(calls.imageCleared, true);
  assert.deepEqual([canvas.width, canvas.height], [0, 0]);
  await assert.rejects(
    rasterizeBrandingSvg(file, { minimumSize: { width: 1920, height: 1080 } }),
    { code: "cropSize" },
  );
});

test("an SVG PNG export keeps the original pending if uploading fails, then retries the PNG", async (t) => {
  const values = storage(t);
  const browserOptions = { width: 1000, height: 500, nullBlob: true };
  imageBrowser(t, browserOptions);
  const url = "/api/event/setup/media/77777777-7777-4777-8777-777777777777";
  let uploads = 0;
  const {
    applySetupLocalMedia,
    clearUnneededSetupLocalMedia,
    prepareSetupBranding,
    setupLocalMediaKey,
  } = loadSource({
    "@/core/api": {
      api: {
        async postForm(route, body) {
          assert.equal(route, "/event/setup/media");
          assert.equal(body.get("eventId"), "event-a");
          assert.equal(body.get("file").type, "image/png");
          assert.equal(body.get("file").name, "mark.png");
          if (++uploads === 1) throw new Error("storage unavailable");
          return { url };
        },
      },
    },
  })("src/core/event/setup-media-local.ts");
  const key = setupLocalMediaKey("owner", "event-a", "th");
  const svg = { name: "mark.svg", url: "data:image/svg+xml;base64,PHN2Zy8+" };
  const initial = { ...defaultEventBranding, wordmark: svg };

  const pending = await prepareSetupBranding(
    initial, defaultEventBranding, [], new Set(["wordmark"]), key, "event-a",
  );
  assert.deepEqual(pending.pendingMedia, ["wordmark"]);
  assert.deepEqual(JSON.parse(values.get(key)).wordmark, svg);
  assert.equal(uploads, 0);
  const restored = applySetupLocalMedia(pending.value, key, pending.pendingMedia);
  assert.deepEqual(restored.wordmark, svg);

  browserOptions.nullBlob = false;
  const unavailable = await prepareSetupBranding(
    restored, pending.value, pending.pendingMedia, new Set(), key, "event-a",
  );
  assert.equal(uploads, 1);
  assert.deepEqual(unavailable.pendingMedia, ["wordmark"]);
  assert.deepEqual(JSON.parse(values.get(key)).wordmark, svg);
  const accepted = await prepareSetupBranding(
    restored, unavailable.value, unavailable.pendingMedia, new Set(), key, "event-a",
  );
  assert.deepEqual(accepted.pendingMedia, []);
  assert.deepEqual(accepted.value.wordmark, { name: "mark.png", url });
  assert.equal(uploads, 2);
  assert.ok(values.has(key));
  clearUnneededSetupLocalMedia(key, accepted.pendingMedia);
  assert.equal(values.has(key), false);
});

test("unreadable image fallback reports an error and never leaks its temporary URL", async (t) => {
  const { calls } = imageBrowser(t, { bitmapError: true, decodeError: true });
  await assert.rejects(
    prepareBrandingImage(
      new File(["not-image"], "broken.png", { type: "image/png" }),
    ),
    { code: "fileRead" },
  );
  assert.deepEqual(calls.revoked, calls.urls);
  assert.equal(calls.encodes.length, 0);
});
test("same-format Branding images and banner crop position survive a local save", (t) => {
  storage(t);
  const key = eventBrandingKey("owner", "event-a", "th");
  const value = {
    ...defaultEventBranding,
    layout: "landscape",
    logo: { name: "logo.avif", url: "data:image/avif;base64,YQ==" },
    banner: {
      name: "banner.gif",
      url: "data:image/gif;base64,YQ==",
      cropPosition: 0,
    },
  };
  assert.equal(saveEventBranding(key, value), "saved");
  assert.deepEqual(loadEventBranding(key), value);
  assert.equal(
    saveEventBranding(key, {
      ...value,
      banner: { ...value.banner, cropPosition: 101 },
    }),
    "invalid",
  );
  assert.deepEqual(loadEventBranding(key), value);
});
test("a quota failure while replacing an image preserves the previously saved branding", (t) => {
  const values = storage(t);
  const key = eventBrandingKey("owner", "event-a", "th");
  const previous = {
    ...defaultEventBranding,
    logo: { name: "old.png", url: "data:image/png;base64,aGVsbG8=" },
  };
  assert.equal(saveEventBranding(key, previous), "saved");
  const before = values.get(key);
  globalThis.localStorage.setItem = () => {
    throw Error("QuotaExceededError");
  };
  const replacement = {
    ...previous,
    logo: { name: "new.webp", url: "data:image/webp;base64,V0VCUA==" },
  };
  assert.equal(saveEventBranding(key, replacement), "error");
  assert.equal(values.get(key), before);
  assert.deepEqual(loadEventBranding(key), previous);
});
test("Branding translations have matching keys", () => {
  const th = JSON.parse(
      fs.readFileSync(path.join(root, "src/messages/th.json")),
    ),
    en = JSON.parse(fs.readFileSync(path.join(root, "src/messages/en.json")));
  assert.deepEqual(
    Object.keys(th.eventBranding).sort(),
    Object.keys(en.eventBranding).sort(),
  );
});

test("participant labels stay readable on light and dark brand colors", () => {
  const { brandingNeedsLightText } = load("src/core/event/branding.ts");
  assert.equal(brandingNeedsLightText("#000000"), true);
  assert.equal(brandingNeedsLightText("#FFFFFF"), false);
  assert.equal(brandingNeedsLightText(defaultEventBranding.secondary), false);
});

test("published owner demo settings persist locally across reloads without changing server status", (t) => {
  storage(t);
  const published = {
    ...seed,
    eventStatus: "open",
    userRole: "event_owner",
    canEditEvent: false,
  };
  const key = eventDraftKey("owner", seed.eventId, "th");
  assert.equal(
    saveEventDraft(key, { ...seed, eventName: "Local owner edit" }),
    "saved",
  );
  const restored = restoreEventDraft(published, "owner", "th");
  assert.equal(restored.eventName, "Local owner edit");
  assert.equal(restored.eventStatus, "open");
  assert.equal(restored.canEditEvent, false);
  assert.equal(published.eventName, "Event");
  assert.equal(
    restoreEventDraft({ ...published, userRole: "sub_user" }, "owner", "th")
      .eventName,
    "Event",
  );
});

test("participant preview exposes only enabled forms across normalized access states", () => {
  const { participantFormActions } = load("src/core/event/participant.ts");
  for (const hasRegistration of [false, true])
    for (const hasSurvey of [false, true]) {
      const actions = participantFormActions(
        normalizeEventAccess({ ...seed, hasRegistration, hasSurvey }),
      );
      assert.deepEqual(actions, [
        ...(hasRegistration ? ["registration"] : []),
        ...(hasSurvey ? ["survey"] : []),
      ]);
    }
});
test("participant translations match across locales", () => {
  const th = JSON.parse(
      fs.readFileSync(path.join(root, "src/messages/th.json")),
    ),
    en = JSON.parse(fs.readFileSync(path.join(root, "src/messages/en.json")));
  assert.deepEqual(
    Object.keys(th.participantEvent).sort(),
    Object.keys(en.participantEvent).sort(),
  );
});

test("full preview copy matches the Figma state in both locales", () => {
  const th = JSON.parse(
      fs.readFileSync(path.join(root, "src/messages/th.json")),
    ),
    en = JSON.parse(fs.readFileSync(path.join(root, "src/messages/en.json")));
  assert.deepEqual(
    Object.keys(th.eventPreview).sort(),
    Object.keys(en.eventPreview).sort(),
  );
  assert.equal(th.eventPreview.title, "กำลังอยู่ในโหมด Preview");
  assert.equal(
    th.eventPreview.description,
    "ดูตัวอย่างเท่านั้น · ไม่ส่งคำตอบหรือลงทะเบียนจริง",
  );
  assert.equal(th.eventPreview.back, "กลับไปหน้าตั้งค่า");
});

test("banner palette ranks sampled colors and skips transparent pixels", () => {
  const { bannerPalette } = load("src/core/event/branding-colors.ts");
  const pixels = Uint8ClampedArray.from([
    0, 0, 0, 0, 255, 255, 255, 255, 16, 32, 48, 255, 17, 33, 49, 255,
  ]);
  assert.deepEqual(bannerPalette(pixels), ["#102030", "#FFFFFF"]);
  assert.deepEqual(bannerPalette(new Uint8ClampedArray(4)), []);
});
test("arbitrary picker colors persist immediately without altering other fields", (t) => {
  storage(t);
  const key = eventBrandingKey("owner", "event-a", "th");
  for (const field of ["primary", "secondary", "accent"])
    for (const color of [
      "#1279BD",
      "#03AB7F",
      "#101021",
      "#FFFFFF",
      "#000000",
    ]) {
      const next = { ...defaultEventBranding, [field]: color };
      assert.equal(saveEventBranding(key, next), "saved");
      assert.deepEqual(loadEventBranding(key), next);
    }
});
test("Secondary colors the participant content exactly and text stays readable on arbitrary surfaces", () => {
  const { participantColors } = load("src/core/event/participant-colors.ts");
  const luminance = (hex) =>
    [1, 3, 5]
      .map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255)
      .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
      .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
  const contrast = (a, b) =>
    (Math.max(luminance(a), luminance(b)) + 0.05) /
    (Math.min(luminance(a), luminance(b)) + 0.05);
  for (const secondary of [
    "#FFFFFF",
    "#000000",
    "#4D80E8",
    "#767676",
    "#E9DBF5",
    "#112233",
  ])
    for (const accent of ["#FFFFFF", "#000000", "#8365A0", secondary]) {
      const colors = participantColors({
        ...defaultEventBranding,
        secondary,
        accent,
      });
      assert.equal(colors["--participant-surface"], secondary);
      assert.ok(
        contrast(colors["--participant-on-secondary"], secondary) >= 4.5,
      );
      assert.ok(contrast(colors["--participant-link"], secondary) >= 4.5);
      assert.ok(
        contrast(colors["--participant-control-text"], "#FFFFFF") >= 4.5,
      );
    }
});
test("Participant header and footer honor selected colors and opacity", () => {
  const { participantColors } = load("src/core/event/participant-colors.ts");
  const branding = {
    ...defaultEventBranding, primary: "#FFFFFF", secondary: "#000000", footerColor: "#112244",
    accent: "#FFFF00", chromeOpacity: 50, transparentChrome: true,
    backgroundMode: "gradient", gradientEnd: "#222222", gradientAngle: 90,
  };
  const colors = participantColors(branding);
  assert.equal(colors["--participant-header-surface"], "#FFFFFF80");
  assert.equal(colors["--participant-footer-surface"], "#11224480");
  assert.equal(colors["--participant-on-header"], "#000000");
  assert.equal(colors["--participant-on-footer"], "#FFFFFF");
  for (const value of [-1, 101, 2.5]) {
    assert.equal(eventBrandingSchema.safeParse({ ...branding, chromeOpacity: value }).success, false);
  }
  assert.equal(eventBrandingSchema.parse(branding).chromeOpacity, 50);
});
test("Participant chrome uses the content surface for transparent foregrounds", () => {
  const { participantColors } = load("src/core/event/participant-colors.ts");
  const branding = { ...defaultEventBranding, primary: "#FFFFFF", secondary: "#000000" };
  const opaque = participantColors(branding);
  assert.equal(opaque["--participant-header-surface"], "#FFFFFF");
  assert.equal(opaque["--participant-footer-surface"], "#000000");
  assert.equal(opaque["--participant-on-header"], "#000000");

  const transparent = participantColors({ ...branding, transparentChrome: true });
  assert.equal(transparent["--participant-header-surface"], "transparent");
  assert.equal(transparent["--participant-footer-surface"], "transparent");
  assert.equal(transparent["--participant-surface"], "#000000");
  assert.equal(transparent["--participant-on-header"], "#FFFFFF");
  assert.equal(transparent["--participant-on-secondary"], "#FFFFFF");
});
test("cached branding dialogs can resolve their picker labels after a dictionary update", async () => {
  const { createTranslator } = await import("next-intl");
  for (const locale of ["th", "en"]) {
    const messages = JSON.parse(fs.readFileSync(path.join(root, `src/messages/${locale}.json`)));
    const t = createTranslator({
      messages, locale, namespace: "eventBranding.colorPicker",
      onError(error) { throw error; },
    });
    for (const key of [
      "accent", "hint", "hue", "selected", "palette", "done", "spectrum",
      "saturation", "brightness", "hex", "native",
    ]) assert.ok(t(key).trim());
    assert.ok(t("title", { name: "Primary" }).includes("Primary"));
    assert.ok(t("bannerPalette", { name: "Primary" }).includes("Primary"));
    assert.ok(t("selectColor", { color: "#224466" }).includes("#224466"));
  }
});

const {
  publicationSchema, publicationIssues, publicationKey, publicationV2Key,
  loadEventPublication, loadPublication,
} = load("src/core/event/publication.ts");
/** Fixture writers for v1/v2 data from the previous browser-only implementation. */
/** Store only valid draft fields; keep an earlier valid save when validation fails. */
function saveEventDraft(key, draft) {
  const result = eventDraftSchema.safeParse(draft);
  if (!result.success) return "invalid";
  const parsed = result.data;
  if (parsed.startsAt && parsed.endsAt && Date.parse(parsed.endsAt) <= Date.parse(parsed.startsAt)) return "invalid";
  try {
    globalThis.localStorage.setItem(
      key,
      JSON.stringify(projectEventContent(parsed)),
    );
    notifyEventSetupSaved(key);
    return "saved";
  } catch {
    return "error";
  }
}

function saveEventBranding(key, branding) {
  const parsed = eventBrandingSchema.safeParse(branding);
  if (!parsed.success) return "invalid";
  try {
    globalThis.localStorage.setItem(key, JSON.stringify(parsed.data));
    return "saved";
  } catch {
    return "error";
  }
}
function savePublication(key, value) {
  const parsed = publicationSchema.safeParse(value);
  if (
    !parsed.success ||
    publicationIssues(parsed.data.draft, parsed.data.forms).length ||
    loadPublication(key)
  )
    return false;
  try {
    globalThis.localStorage.setItem(
      key,
      JSON.stringify({
        ...parsed.data,
        draft: projectEventContent(parsed.data.draft),
      }),
    );
    notifyEventSetupSaved(key);
    return true;
  } catch {
    return false;
  }
}

async function saveEventPublication(userId, eventId, locale, value) {
  const sharedKey = publicationV2Key(userId, eventId);
  const multilingual = !!value.draft.content;
  const key = multilingual
    ? sharedKey
    : publicationKey(userId, eventId, locale);
  const write = () =>
    !loadEventPublication(userId, eventId, locale, multilingual) &&
    savePublication(key, value);

  // Hold a single browser lock across the receipt check and write when Web
  // Locks are available. Both operations stay synchronous inside the lock.
  try {
    const locks = globalThis.navigator?.locks;
    return locks ? await locks.request(sharedKey, write) : write();
  } catch {
    return false;
  }
}

const { canEditLocalEventSetup } = load("src/core/event/draft.ts");
const { setupFormStatus, selectSetupForms } = load(
  "src/core/event/form-summary.ts",
);
const publishDraft = {
  ...seed,
  locationName: "Event venue",
  startsAt: "2027-01-01T03:00:00.000Z",
  endsAt: "2027-01-02T03:00:00.000Z",
};
function formSummary(type) {
  const label = {
    label: "Question",
    placeholder: "",
    choices: { th: [], en: [] },
  };
  return {
    id: `${type}-1`,
    eventId: "event-a",
    type,
    status: "draft",
    opensAt: "2027-01-01T03:00:00.000Z",
    closesAt: "2027-01-02T03:00:00.000Z",
    acceptingResponses: false,
    publishedAt: null,
    createdAt: "2027-01-01T00:00:00.000Z",
    updatedAt: "2027-01-01T00:00:00.000Z",
    head: {
      th: { title: "Form", description: "" },
      en: { title: "Form", description: "" },
    },
    questions: [
      {
        question: {
          id: "q1",
          type: "short_text",
          display_order: 1,
          min_number: 0,
          max_number: 5,
          min_length: 0,
          max_length: 255,
          required: true,
          label: { th: [label], en: [label] },
        },
      },
    ],
  };
}
test("Raksit summaries adapt existing BFF statuses without mutating definitions", () => {
  const rows = [formSummary("survey"), formSummary("registration")];
  assert.equal(selectSetupForms(rows).registration.id, "registration-1");
  assert.equal(selectSetupForms([]).survey, null);
  assert.equal(setupFormStatus("published"), "open");
  assert.equal(setupFormStatus("pending_approval"), "scheduled");
  assert.equal(setupFormStatus("closed"), "closed");
  assert.equal(rows[0].status, "draft");
});
test("Publication reports each form's validation at its own checklist row", () => {
  const { reviewPublication } = load("src/core/event/publication.ts");
  const registration = { ...formSummary("registration"), questions: [], status: "scheduled" };
  const survey = { ...formSummary("survey"), status: "archived" };
  const draft = { ...publishDraft, surveyAccess: "public" };
  const review = reviewPublication(draft, { registration, survey }, [registration, survey]);
  assert.deepEqual(review.formProblems, { registration: ["formContent"], survey: ["formStatus"] });
  assert.deepEqual(review.issues.sort(), ["formContent", "formStatus"]);
  const registeredOnly = reviewPublication({ ...draft, surveyAccess: "registered_only" }, { registration, survey }, [registration, survey]);
  assert.ok(registeredOnly.issues.includes("registeredEligibility"));
  assert.ok(!registeredOnly.issues.includes("whitelist"));
});
test("SRS permits no forms and blocks enabled forms with incomplete metadata or schedules", () => {
  assert.deepEqual(
    publicationIssues(
      {
        ...publishDraft,
        hasRegistration: false,
        hasSurvey: false,
        surveyAccess: null,
      },
      { registration: null, survey: null },
    ),
    [],
  );
  const forms = {
    registration: formSummary("registration"),
    survey: formSummary("survey"),
  };
  const { reviewPublication } = load("src/core/event/publication.ts");
  assert.deepEqual(
    reviewPublication({ ...publishDraft, surveyAccess: "public" }, forms, Object.values(forms)).issues,
    [],
  );
  assert.deepEqual(
    publicationIssues({ ...publishDraft, surveyAccess: "public" }, forms),
    [],
  );
  const incomplete = structuredClone(forms);
  incomplete.survey.questions[0].question.label.th[0].label = " ";
  assert.ok(
    publicationIssues(
      { ...publishDraft, surveyAccess: "public" },
      incomplete,
    ).includes("formContent"),
  );
  incomplete.survey.closesAt = incomplete.survey.opensAt;
  assert.ok(
    publicationIssues(publishDraft, incomplete).includes("surveySchedule"),
  );
  assert.ok(publicationIssues(publishDraft, forms).includes("uniqueField"));
  assert.ok(
    publicationIssues({ ...publishDraft, isPrivate: true }, forms).includes(
      "whitelist",
    ),
  );
  assert.ok(
    publicationIssues(
      { ...publishDraft, registrationCapacity: 0 },
      forms,
    ).includes("capacity"),
  );
});
test("local publication is a validated immutable snapshot and cannot alter server lifecycle", (t) => {
  storage(t);
  const key = publicationKey("owner", "event-a", "th");
  const draft = {
    ...publishDraft,
    hasRegistration: false,
    hasSurvey: false,
    surveyAccess: null,
  };
  const payload = {
    publishedAt: "2027-01-01T00:00:00.000Z",
    draft,
    branding: defaultEventBranding,
    forms: { registration: null, survey: null },
  };
  assert.equal(
    savePublication(key, { ...payload, draft: { ...draft, eventName: " " } }),
    false,
  );
  assert.equal(savePublication(key, payload), true);
  assert.equal(
    savePublication(key, {
      ...payload,
      draft: { ...draft, eventName: "Overwrite" },
    }),
    false,
  );
  assert.equal(loadPublication(key).draft.eventName, "Event");
  assert.equal(loadPublication(publicationKey("owner", "event-a", "en")), null);
  assert.equal(
    canEditLocalEventSetup({ ...seed, localPublishedAt: payload.publishedAt }),
    false,
  );
  assert.equal(seed.eventStatus, "draft");
});
test("publication storage failure never reports success or leaves a partial receipt", (t) => {
  storage(t);
  globalThis.localStorage.setItem = () => {
    throw new Error("QuotaExceededError");
  };
  assert.equal(
    savePublication("key", {
      publishedAt: "2027-01-01T00:00:00.000Z",
      draft: {
        ...publishDraft,
        hasRegistration: false,
        hasSurvey: false,
        surveyAccess: null,
      },
      branding: defaultEventBranding,
      forms: { registration: null, survey: null },
    }),
    false,
  );
  assert.equal(loadPublication("key"), null);
});
test("Raksit setup and publish translations stay aligned across TH and EN", () => {
  const th = JSON.parse(
    fs.readFileSync(path.join(root, "src/messages/th.json")),
  );
  const en = JSON.parse(
    fs.readFileSync(path.join(root, "src/messages/en.json")),
  );
  const keys = (value) =>
    Object.entries(value)
      .flatMap(([key, item]) =>
        typeof item === "object"
          ? keys(item).map((child) => `${key}.${child}`)
          : key,
      )
      .sort();
  for (const name of ["eventForms", "eventPublish"])
    assert.deepEqual(keys(th[name]), keys(en[name]));
});

const whitelist = load("src/core/event/whitelist.ts");
const whitelistEntry = (uniqueId, status = "available") => ({
  id: uniqueId,
  uniqueId,
  name: "Attendee",
  status,
});
test("Whitelist manual validation trims IDs, ignores email case and never re-grants used IDs", () => {
  assert.equal(
    whitelist.normalizeWhitelistId("  TEST@Example.com "),
    "test@example.com",
  );
  assert.equal(
    whitelist.whitelistEntryIssue(" TEST@EXAMPLE.COM ", [
      whitelistEntry("test@example.com"),
    ]),
    "duplicate",
  );
  assert.equal(
    whitelist.whitelistEntryIssue("used@example.com", [
      whitelistEntry("used@example.com", "joined"),
    ]),
    "used",
  );
  assert.equal(
    whitelist.whitelistEntryIssue("not-an-email", []),
    "invalidEmail",
  );
  assert.equal(whitelist.whitelistEntryIssue(" ", []), "emptyId");
});
test("Whitelist CSV supports BOM, CRLF, quoted commas, quotes and multiline names", () => {
  const rows = whitelist.parseWhitelistCsv(
    '\uFEFFUnique ID,Name\r\na@example.com,"A, B"\r\nb@example.com,"Line 1\nLine ""2"""\r\n',
  );
  assert.deepEqual(rows, [
    ["Unique ID", "Name"],
    ["a@example.com", "A, B"],
    ["b@example.com", 'Line 1\nLine "2"'],
  ]);
  assert.throws(() =>
    whitelist.parseWhitelistCsv('Unique ID,Name\na@example.com,"Unclosed'),
  );
  assert.throws(() =>
    whitelist.parseWhitelistCsv('Unique ID,Name\na@example.com,"A"bad'),
  );
});
test("Whitelist preview isolates invalid rows, detects missing/duplicate headers, and never changes the active list", () => {
  const current = [whitelistEntry("used@example.com", "joined")];
  const result = whitelist.previewWhitelistImport(
    [
      [" Unique ID ", "Name"],
      [" NEW@example.com ", "New"],
      ["new@example.com", "Duplicate"],
      ["bad-email", "Invalid"],
      ["used@example.com", "Used"],
      ["", "Blank ID"],
      ["", ""],
    ],
    "list.csv",
    current,
  );
  assert.equal(result.columnMismatch, false);
  assert.equal(result.entries.length, 1);
  assert.equal(result.entries[0].uniqueId, "new@example.com");
  assert.equal(result.invalidCount, 4);
  assert.equal(current.length, 1);
  assert.equal(current[0].status, "joined");
  assert.equal(
    whitelist.previewWhitelistImport([["Name"], ["A"]], "bad.csv", [])
      .columnMismatch,
    true,
  );
  assert.equal(
    whitelist.previewWhitelistImport(
      [["Unique ID", " unique id "]],
      "bad.csv",
      [],
    ).columnMismatch,
    true,
  );
  assert.equal(
    whitelist.previewWhitelistImport(
      [["Unique ID"], ["one@example.com"]],
      "id.csv",
      [],
    ).entries.length,
    1,
  );
});
test("Whitelist import replaces only unused entries and preserves used records", () => {
  const used = whitelistEntry("used@example.com", "joined");
  const current = [used, whitelistEntry("old@example.com")];
  const next = whitelist.replaceWhitelist(current, [
    whitelistEntry("new@example.com"),
    whitelistEntry("used@example.com"),
  ]);
  assert.deepEqual(
    next.map((entry) => entry.uniqueId),
    ["used@example.com", "new@example.com"],
  );
  assert.equal(next[0], used);
  assert.equal(current.length, 2);
});
test("Legacy Whitelist recovery reads valid entries only for the matching browser scope", (t) => {
  const values = storage(t);
  const key = whitelist.whitelistKey("owner", "event-a", "th");
  const entries = [whitelistEntry("one@example.com")];
  values.set(key, JSON.stringify(entries));
  assert.deepEqual(whitelist.readLegacyWhitelists("owner", "event-a")[0].entries, entries);
  for (const args of [
    ["other", "event-a"],
    ["owner", "event-b"],
  ]) {
    assert.deepEqual(whitelist.readLegacyWhitelists(...args), []);
  }
  values.set(key, JSON.stringify([...entries, { ...entries[0], id: "another" }]));
  assert.deepEqual(whitelist.readLegacyWhitelists("owner", "event-a"), []);
  values.set(key, "{broken");
  assert.deepEqual(whitelist.readLegacyWhitelists("owner", "event-a"), []);
  assert.equal(values.get(key), "{broken");
});
test("Legacy Whitelist recovery keeps unused evidence until the server verifies each source", (t) => {
  const values = storage(t);
  globalThis.localStorage.removeItem = (key) => values.delete(key);
  const thai = whitelist.whitelistKey("owner", "event-a", "th");
  const english = whitelist.whitelistKey("owner", "event-a", "en");
  const added = whitelistEntry("one@example.com");
  const used = whitelistEntry("used@example.com", "joined");
  const mismatch = { ...whitelistEntry("member@example.com"), name: "Earlier name" };
  const active = [{ ...mismatch, name: "Current name" }, used];
  values.set(thai, JSON.stringify([added, used]));
  values.set(english, JSON.stringify([mismatch]));
  const savedSources = whitelist.readLegacyWhitelists("owner", "event-a");
  const field = { id: "email-field", type: "email" };
  const planned = whitelist.mergeLegacyWhitelist(active, savedSources, field);
  assert.deepEqual(planned.entries, [...active, added]);
  assert.equal(planned.matches, 2);
  assert.equal(planned.unresolved, 1);
  whitelist.removeVerifiedLegacyWhitelists(active, savedSources, field);
  assert.equal(values.size, 2);
  whitelist.removeVerifiedLegacyWhitelists(planned.entries, savedSources, field);
  assert.equal(values.has(thai), false);
  assert.equal(values.has(english), true);
});
test("Whitelist validation follows the configured registration field and preserves used IDs", () => {
  const form = {
    type: "registration",
    questions: [{ question: { id: "member-number", type: "number", is_unique: true, min_value: 0, max_value: 100 } }],
  };
  const field = whitelist.whitelistUniqueField(form);
  assert.deepEqual(field, { id: "member-number", type: "number", min: 0, max: 100 });
  assert.equal(whitelist.whitelistUniqueField({ ...form, type: "survey" }), null);
  const first = whitelistEntry("001.0");
  const normalized = whitelist.parseWhitelistEntries([first], field);
  assert.equal(normalized[0].uniqueId, "1");
  assert.equal(whitelist.parseWhitelistEntries([first, whitelistEntry("1e0")], field), null);
  assert.equal(whitelist.parseWhitelistEntries([whitelistEntry("101")], field), null);
  assert.equal(whitelist.parseWhitelistEntries([whitelistEntry("0x10")], field), null);
  const fieldText = { id: "member-id", type: "short_text", minLength: 2, maxLength: 4 };
  const textEntries = whitelist.parseWhitelistEntries([whitelistEntry(" Abc "), whitelistEntry("abc")], fieldText);
  assert.deepEqual(textEntries.map(({ uniqueId }) => uniqueId), ["Abc", "abc"]);
  assert.equal(whitelist.parseWhitelistEntries([whitelistEntry("A")], fieldText), null);
  const used = { ...normalized[0], status: "joined" };
  assert.deepEqual(whitelist.replaceWhitelist([used], [{ ...first, uniqueId: "2" }]), [used]);
});
test("Whitelist editing requires Registration permission and Private access, and local Publish locks it", () => {
  const workspace = { ...seed, isPrivate: true, canManageWhitelist: true };
  assert.equal(whitelist.canEditWhitelist(workspace), true);
  assert.equal(
    whitelist.canEditWhitelist({ ...workspace, canManageWhitelist: false }),
    false,
  );
  assert.equal(
    whitelist.canEditWhitelist({ ...workspace, isPrivate: false }),
    false,
  );
  assert.equal(
    whitelist.canEditWhitelist({ ...workspace, hasRegistration: false }),
    false,
  );
  assert.equal(
    whitelist.canEditWhitelist({
      ...workspace,
      localPublishedAt: "2026-11-09T00:00:00Z",
    }),
    false,
  );
  assert.equal(
    whitelist.canEditWhitelist({
      ...workspace,
      eventStatus: "open",
      userRole: "sub_user",
    }),
    false,
  );
});
test("Whitelist translations have complete matching TH/EN keys", () => {
  const th = JSON.parse(
    fs.readFileSync(path.join(root, "src/messages/th.json")),
  ).eventWhitelist;
  const en = JSON.parse(
    fs.readFileSync(path.join(root, "src/messages/en.json")),
  ).eventWhitelist;
  assert.deepEqual(Object.keys(th).sort(), Object.keys(en).sort());
  assert.deepEqual(
    Object.keys(th.errors).sort(),
    Object.keys(en.errors).sort(),
  );
});

const { restoreLocalEventWorkspace, eventWorkspaceDisplayStatus } = load(
  "src/core/event/workspace.ts",
);
const { notifyEventSetupSaved, subscribeToEventSetup } = load("src/core/event/local-events.ts");
function setupWindow(t) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  const target = new EventTarget();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: target,
  });
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else delete globalThis.window;
  });
  return target;
}
function dispatchStorage(target, key, storageArea = null) {
  const event = new Event("storage");
  Object.defineProperties(event, {
    key: { value: key },
    storageArea: { value: storageArea },
  });
  target.dispatchEvent(event);
}
test("Overview updates saved form selections immediately, restores them on return, and ignores failed saves", (t) => {
  const values = storage(t);
  setupWindow(t);
  const key = eventDraftKey("owner", seed.eventId, "th");
  let overview = restoreLocalEventWorkspace(seed, "owner", "th");
  let updates = 0;
  const unsubscribe = subscribeToEventSetup([key], () => {
    overview = restoreLocalEventWorkspace(seed, "owner", "th");
    updates++;
  });
  t.after(unsubscribe);
  for (const [registration, survey, access] of [
    [false, true, "public"],
    [false, false, null],
    [true, false, null],
    [true, true, "registered_only"],
  ]) {
    assert.equal(
      saveEventDraft(key, {
        ...seed,
        hasRegistration: registration,
        hasSurvey: survey,
        surveyAccess: "registered_only",
      }),
      "saved",
    );
    assert.equal(overview.hasRegistration, registration);
    assert.equal(overview.hasSurvey, survey);
    assert.equal(overview.surveyAccess, access);
    assert.deepEqual(restoreLocalEventWorkspace(seed, "owner", "th"), overview);
  }
  const last = values.get(key);
  assert.equal(updates, 4);
  assert.equal(
    saveEventDraft(key, { ...seed, startsAt: "bad date" }),
    "invalid",
  );
  globalThis.localStorage.setItem = () => {
    throw Error("QuotaExceededError");
  };
  assert.equal(
    saveEventDraft(key, { ...seed, hasRegistration: false }),
    "error",
  );
  assert.equal(updates, 4);
  assert.equal(values.get(key), last);
  assert.equal(overview.hasRegistration, true);
  assert.equal(seed.hasRegistration, true);
});
test("Overview subscriptions isolate user/event/locale and handle cross-tab replacement, removal, clear and cleanup", (t) => {
  const values = storage(t);
  const target = setupWindow(t);
  const key = eventDraftKey("owner", seed.eventId, "th");
  let overview = seed;
  let updates = 0;
  const unsubscribe = subscribeToEventSetup([key], () => {
    overview = restoreLocalEventWorkspace(seed, "owner", "th");
    updates++;
  });
  t.after(unsubscribe);
  for (const otherKey of [
    eventDraftKey("other", seed.eventId, "th"),
    eventDraftKey("owner", "other-event", "th"),
    eventDraftKey("owner", seed.eventId, "en"),
  ]) {
    saveEventDraft(otherKey, { ...seed, hasRegistration: false });
    dispatchStorage(target, otherKey);
  }
  assert.equal(updates, 0);
  values.set(key, JSON.stringify({ ...seed, hasRegistration: false }));
  dispatchStorage(target, key, {}); // SessionStorage/unrelated storage must not update.
  assert.equal(updates, 0);
  dispatchStorage(target, key, globalThis.localStorage);
  assert.equal(overview.hasRegistration, false);
  assert.equal(overview.surveyAccess, "public");
  values.delete(key);
  dispatchStorage(target, key, globalThis.localStorage);
  assert.equal(overview.hasRegistration, true);
  values.set(key, "{broken");
  dispatchStorage(target, key);
  assert.equal(overview.hasRegistration, true);
  values.clear();
  dispatchStorage(target, null);
  assert.deepEqual(overview, seed);
  assert.equal(updates, 4);
  unsubscribe();
  saveEventDraft(key, { ...seed, hasRegistration: false });
  dispatchStorage(target, key);
  assert.equal(updates, 4);
  assert.equal(
    restoreLocalEventWorkspace({ ...seed, canEditEvent: false }, "owner", "th")
      .hasRegistration,
    true,
  );
});
test("Overview follows the immutable local publication after save and ignores later drafts without changing server lifecycle", (t) => {
  storage(t);
  setupWindow(t);
  const key = publicationKey("owner", seed.eventId, "th");
  const draftKey = eventDraftKey("owner", seed.eventId, "th");
  const draft = {
    ...publishDraft,
    hasRegistration: false,
    hasSurvey: false,
    surveyAccess: null,
  };
  let overview = seed;
  const unsubscribe = subscribeToEventSetup([key, draftKey], () => {
    overview = restoreLocalEventWorkspace(seed, "owner", "th");
  });
  t.after(unsubscribe);
  const publication = {
    publishedAt: "2027-01-01T00:00:00.000Z",
    draft,
    branding: defaultEventBranding,
    forms: { registration: null, survey: null },
  };
  assert.equal(savePublication(key, publication), true);
  assert.equal(overview.hasRegistration, false);
  assert.equal(overview.hasSurvey, false);
  assert.equal(overview.localPublishedAt, publication.publishedAt);
  saveEventDraft(draftKey, { ...seed, hasRegistration: true, hasSurvey: true });
  assert.equal(overview.hasRegistration, false);
  assert.equal(overview.hasSurvey, false);
  assert.equal(overview.eventStatus, seed.eventStatus);
  assert.equal(overview.canEditEvent, seed.canEditEvent);
  assert.equal(canEditLocalEventSetup(overview), false);
  assert.deepEqual(restoreLocalEventWorkspace(seed, "owner", "th"), overview);
});

/** Exercise real setup action handlers with injected hook results, without a test UI package. */
function compileSetupComponent(relative, mocks = {}) {
  const mod = { exports: {} };
  const source = ts.transpileModule(
    fs.readFileSync(path.join(root, relative), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
      },
    },
  ).outputText;
  new Function("require", "exports", source)(
    (name) => (name in mocks ? mocks[name] : require(name)),
    mod.exports,
  );
  return mod.exports.default;
}
const setupButton = compileSetupComponent(
  "src/components/ui/button/Button.tsx",
);
const setupActions = compileSetupComponent(
  "src/components/event/setup/EventSetupActions.tsx",
  {
    "@/components/ui/button/Button": { default: setupButton },
  },
);
function findSetupElement(node, predicate) {
  if (!node || typeof node !== "object") return null;
  if (predicate(node)) return node;
  for (const child of [node.props?.children].flat(Infinity)) {
    const found = findSetupElement(child, predicate);
    if (found) return found;
  }
  return null;
}
test("Branding preview tabs show the selected participant surface and implement keyboard navigation", () => {
  const PublicForm = () => null;
  const PreviewSkeleton = compileSetupComponent(
    "src/components/event/participant/forms/ParticipantFormPreviewSkeleton.tsx",
    { "@/components/ui/skeleton/Skeleton": { default: () => null } },
  );
  const forms = ["registration", "survey"].map((type) => ({ id: type, type }));
  let selection;
  const Preview = compileSetupComponent(
    "src/components/event/setup/branding/BrandingPreviewGallery.tsx",
    {
      "@/components/event/participant/forms/PublicParticipantForm": { default: PublicForm },
      "@/components/event/participant/forms/ParticipantFormPreviewSkeleton": { default: PreviewSkeleton },
      "@/components/ui/button/Button": { default: setupButton },
      "@/core/event/form-summary": load("src/core/event/form-summary.ts"),
      "@/hooks/useEventFormSummaries": {
        default: (id, enabled) => {
          assert.equal(id, seed.eventId);
          return { forms: enabled ? forms : [] };
        },
      },
      "next-intl": { useTranslations: () => (key) => key },
      react: {
        useId: () => "test-gallery",
        useState: (initial) => [selection ?? initial, (next) => { selection = next; }],
      },
    },
  );
  const props = {
    workspace: { ...seed, canAccessForms: true },
    draft: seed,
    branding: { ...defaultEventBranding, primary: "#123456" },
    bannerUrl: null,
    children: "participant display",
  };
  const render = (overrides = {}) => Preview({ ...props, ...overrides });
  function tab(view, id) {
    return findSetupElement(view, (n) => n.props?.id === "test-gallery-tab-" + id);
  }
  function panel(view, id) {
    return findSetupElement(view, (n) => n.props?.id === "test-gallery-panel-" + id);
  }

  const initial = render();
  const list = findSetupElement(initial, (n) => n.props?.role === "tablist");
  assert.equal(list.props.children.length, 2);
  for (const id of ["display", "form"]) {
    const control = tab(initial, id);
    const section = panel(initial, id);
    assert.equal(control.props.role, "tab");
    assert.equal(control.props["aria-controls"], section.props.id);
    assert.equal(control.props["aria-selected"], id === "display");
    assert.equal(control.props.tabIndex, id === "display" ? 0 : -1);
    assert.equal(section.props.role, "tabpanel");
    assert.equal(section.props["aria-labelledby"], control.props.id);
    assert.equal(section.props.hidden, id !== "display");
    assert.ok(findSetupElement(control, (n) => n.props?.["aria-hidden"] === "true"));
  }
  assert.equal(panel(initial, "display").props.children, props.children);
  assert.equal(findSetupElement(initial, (n) => n.type === PublicForm), null);

  function pressKey(from, key, to) {
    let focused = null;
    let prevented = false;
    tab(render(), from).props.onKeyDown({
      key,
      preventDefault: () => { prevented = true; },
      currentTarget: { ownerDocument: {
        getElementById: (id) => ({ focus: () => { focused = id; } }),
      } },
    });
    assert.equal(prevented, true);
    assert.equal(focused, tab(render(), to).props.id);
    assert.equal(tab(render(), to).props.tabIndex, 0);
  }
  pressKey("display", "ArrowRight", "form");
  pressKey("form", "ArrowLeft", "display");
  pressKey("display", "End", "form");
  pressKey("form", "Home", "display");
  tab(render(), "form").props.onClick();
  const pendingForm = render({ formState: { loading: true, forms: [] } });
  const placeholder = findSetupElement(panel(pendingForm, "form"), (node) => node.type === PreviewSkeleton);
  const status = PreviewSkeleton(placeholder.props);
  assert.equal(status.props.role, "status");
  assert.equal(status.props["aria-busy"], "true");
  assert.equal(status.props["aria-label"], "loading");
  assert.equal(findSetupElement(pendingForm, (node) => node.type === PublicForm), null);
  const formView = render();
  assert.equal(findSetupElement(formView, (node) => node.type === PreviewSkeleton), null);
  assert.equal(panel(formView, "display").props.hidden, true);
  assert.equal(panel(formView, "display").props.children, false);
  assert.equal(panel(formView, "form").props.hidden, false);
  findSetupElement(formView, (n) => n.type === "button" && n.props.children === "survey").props.onClick();
  const getPublicForm = (tree) => findSetupElement(tree, (n) => n.type === PublicForm).props;
  assert.equal(getPublicForm(render()).readOnly, true);
  assert.equal(getPublicForm(render()).branding, props.branding);
  assert.deepEqual(getPublicForm(render()).result, { status: "open", form: forms[1] });
  const disabled = render({ draft: { ...seed, hasSurvey: false, hasRegistration: false } });
  assert.deepEqual(getPublicForm(disabled).result, { status: "unavailable" });
  const failed = render({ formState: { error: true, forms: [] } });
  assert.ok(findSetupElement(failed, (node) => node.props?.role === "alert"));
  assert.equal(findSetupElement(failed, (node) => node.type === PublicForm || node.type === PreviewSkeleton), null);
});

function setupActionButtons(form) {
  const element = findSetupElement(form, (node) => node.type === setupActions);
  const footer = setupActions(element.props);
  const actions = footer.props.children.at(-1);
  const buttons = actions.props.children
    .filter(Boolean)
    .map((node) => node.type(node.props));
  return {
    back: buttons[0],
    next: buttons.at(-1),
    saveDraft: buttons.length === 3 ? buttons[1] : null,
    feedback: element.props.error,
  };
}
function detailsActions(save, query = new URLSearchParams(), saveBranding = () => true) {
  const navigation = [];
  const noop = { default: () => null };
  const messages = JSON.parse(
    fs.readFileSync(path.join(root, "src/messages/th.json")),
  ).eventHome.details;
  const Details = compileSetupComponent(
    "src/components/event/setup/EventDetailsForm.tsx",
    {
      "./details/EventAccessSettings": noop,
      "./details/EventFormSchedule": noop,
      "./details/EventInformationFields": noop,
      "./branding/SetupMediaPanel": noop,
      "@/components/event/setup/EventSetupPendingMedia": noop,
      "./EventSetupBoundary": noop,
      "./EventSetupActions": { default: setupActions },
      "../workspace/EventWorkspacePageHeader": noop,
      "@/hooks/useSetupApiState": { default: () => ({ pending: false }) },
      "@/hooks/useWhitelistNavigationGuard": noop,
      "@/hooks/useEventBranding": {
        default: () => ({ branding: defaultEventBranding, save: saveBranding }),
      },
      "@/utils/alert": { showToast() {} },
      "@/core/event/draft": load("src/core/event/draft.ts"),
      "@/core/event/form-builder-navigation": load("src/core/event/form-builder-navigation.ts"),
      "@/core/event/workspace": load("src/core/event/workspace.ts"),
      "@/hooks/useEventDraft": {
        default: () => ({
          draft: seed,
          status: "idle",
          readOnly: false,
          change() {},
          save,
        }),
      },
      "@/i18n/navigation": {
        useRouter: () => ({ push: (href) => navigation.push(href) }),
      },
      "next/navigation": { useSearchParams: () => query },
      react: { useState: (initial) => [initial, () => {}] },
      "next-intl": { useTranslations: () => (key) => messages[key] ?? key },
    },
  );
  const entry = Details();
  const view = entry.props.component({
    workspace: seed,
    userId: "owner",
    locale: "th",
  });
  const form = findSetupElement(view, (n) => n.type === "form");
  return { form, ...setupActionButtons(form), navigation };
}

test("Form Editor returns to an allowlisted entry and keeps valid content language", async () => {
  const { formBuilderEntryHref, formBuilderReturn } = load("src/core/event/form-builder-navigation.ts");
  const entries = [
    [true, { from: "details", lang: " EN " }, "details", "/event/details?lang=en"],
    [true, { from: "forms", lang: "en" }, "forms", "/event/forms"],
    [true, { from: "publish", lang: ["ja"] }, "publish", "/event/publish?lang=ja"],
    [true, { from: ["publish", "forms"], lang: ["ja", "en"] }, "details", "/event/details"],
    [true, { from: "//attacker.test", lang: "zz" }, "details", "/event/details"],
    [true, {}, "details", "/event/details"],
    [false, { from: "forms" }, "management", "/event/form"],
    [false, { from: "whitelist", lang: "en" }, "whitelist", "/event/whitelist"],
    [false, {}, "management", "/event/form"],
  ];
  for (const [insideSetup, query, origin, href] of entries) {
    assert.deepEqual(formBuilderReturn(query, insideSetup), { origin, href });
  }
  assert.equal(
    formBuilderEntryHref("/event/setup/survey", "publish", ["ja", "en"]),
    "/event/setup/survey?from=publish",
  );
  const details = detailsActions(async () => true, new URLSearchParams("lang=en"));
  findSetupElement(details.form, (node) => node.props.onOpenBuilder).props.onOpenBuilder("survey");
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(details.navigation, ["/event/setup/survey?from=details&lang=en"]);
});

test("Details opens the standalone Whitelist only after both saves succeed", async () => {
  for (const [detailsSaved, brandingSaved] of [[true, true], [false, true], [true, false]]) {
    const saves = [];
    const ui = detailsActions(
      async () => { saves.push("details"); return detailsSaved; },
      new URLSearchParams("lang=en"),
      async () => { saves.push("branding"); return brandingSaved; },
    );
    findSetupElement(ui.form, (node) => node.props.onOpenWhitelist).props.onOpenWhitelist();
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(ui.navigation, detailsSaved && brandingSaved ? ["/event/whitelist?from=details&lang=en"] : []);
    assert.deepEqual(saves, detailsSaved ? ["details", "branding"] : ["details"]);
  }
});

test("Whitelist and Registration Builder preserve their bounded return destinations", () => {
  const { formBuilderEntryHref, formBuilderReturn, whitelistReturn } = load("src/core/event/form-builder-navigation.ts");
  for (const [origin, href] of [["workspace", "/event"], ["details", "/event/details?lang=en"], ["publish", "/event/publish?lang=en"]]) {
    const query = origin === "workspace" ? {} : { from: origin, lang: "EN" };
    const back = whitelistReturn(query);
    assert.deepEqual(back, { origin, href });
    for (const builder of ["/event/setup/registration", "/event/form/registration"]) {
      const entry = new URL(formBuilderEntryHref(builder, "whitelist", query.lang, origin), "https://event.test");
      const returned = formBuilderReturn(Object.fromEntries(entry.searchParams), builder.includes("/setup/"));
      const target = new URL(returned.href, "https://event.test");
      assert.equal(target.pathname, "/event/whitelist");
      assert.deepEqual(whitelistReturn(Object.fromEntries(target.searchParams)), back);
    }
  }
  assert.deepEqual(whitelistReturn({ from: ["details", "publish"], lang: "bad" }), { origin: "workspace", href: "/event" });
  assert.deepEqual(whitelistReturn({ from: "//external.test" }), { origin: "workspace", href: "/event" });
});

test("Details Back and Next await the draft save before navigation; native submit follows Next", async (t) => {
  storage(t);
  const key = eventDraftKey("owner", seed.eventId, "th");
  const draft = { ...seed, eventName: "Latest edit", hasRegistration: false };
  for (const direction of ["back", "next"]) {
    let saves = 0;
    const ui = detailsActions(() => {
      assert.equal(ui.navigation.length, 0);
      saves++;
      return saveEventDraft(key, draft) === "saved";
    });
    assert.equal(ui.back.props.type, "button");
    assert.equal(ui.next.props.type, "submit");
    assert.equal(ui.back.props.children[1], "backWorkspace");
    assert.equal(ui.next.props.children[1], "preview");
    if (direction === "back") ui.back.props.onClick();
    else {
      let prevented = false;
      ui.form.props.onSubmit({
        preventDefault() {
          prevented = true;
        },
      });
      assert.equal(prevented, true);
    }
    assert.deepEqual(ui.navigation, []);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(saves, 1);
    assert.deepEqual(ui.navigation, [
      direction === "back" ? "/event" : "/event/publish",
    ]);
    const saved = restoreEventDraft(seed, "owner", "th");
    assert.equal(saved.eventName, "Latest edit");
    assert.equal(saved.hasRegistration, false);
    assert.equal(saved.surveyAccess, "public");
  }
});
test("Details Back and Next stay on the current page when saving fails", async (t) => {
  const values = storage(t);
  const key = eventDraftKey("owner", seed.eventId, "th");
  saveEventDraft(key, seed);
  const previous = values.get(key);
  const ui = detailsActions(
    () => saveEventDraft(key, { ...seed, startsAt: "invalid" }) === "saved",
  );
  ui.back.props.onClick();
  ui.form.props.onSubmit({ preventDefault() {} });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(ui.navigation, []);
  const quota = detailsActions(
    () => saveEventDraft(key, { ...seed, hasSurvey: false }) === "saved",
  );
  globalThis.localStorage.setItem = () => {
    throw Error("QuotaExceededError");
  };
  quota.back.props.onClick();
  quota.form.props.onSubmit({ preventDefault() {} });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(quota.navigation, []);
  assert.equal(values.get(key), previous);
});

test("Overview shows Draft for saved unpublished local setup without overwriting the server event lifecycle", (t) => {
  const values = storage(t);
  const original = {
    ...seed,
    eventStatus: "open",
    userRole: "event_owner",
    canEditEvent: false,
  };
  const key = eventDraftKey("owner", seed.eventId, "th");
  assert.equal(
    eventWorkspaceDisplayStatus(
      restoreLocalEventWorkspace(original, "owner", "th"),
    ),
    "open",
  );
  assert.equal(saveEventDraft(key, { ...seed, hasSurvey: false }), "saved");
  const restored = restoreLocalEventWorkspace(original, "owner", "th");
  assert.equal(restored.hasLocalDraft, true);
  assert.equal(eventWorkspaceDisplayStatus(restored), "draft");
  assert.equal(restored.eventStatus, "open");
  assert.equal(restored.canEditEvent, false);
  assert.equal(restored.hasSurvey, false);
  assert.equal(
    eventWorkspaceDisplayStatus({
      ...restored,
      localPublishedAt: "2027-01-01T00:00:00.000Z",
    }),
    "open",
  );
  assert.equal(
    eventWorkspaceDisplayStatus(
      restoreLocalEventWorkspace(
        { ...original, userRole: "sub_user" },
        "owner",
        "th",
      ),
    ),
    "open",
  );
  values.set(key, "{invalid");
  assert.equal(
    eventWorkspaceDisplayStatus(
      restoreLocalEventWorkspace(original, "owner", "th"),
    ),
    "open",
  );
  const th = JSON.parse(
    fs.readFileSync(path.join(root, "src/messages/th.json")),
  );
  const en = JSON.parse(
    fs.readFileSync(path.join(root, "src/messages/en.json")),
  );
  assert.equal(th.eventHome.eventStatus.draft, "Draft");
  assert.equal(en.eventHome.eventStatus.draft, "Draft");
});

function setupStep(kind, options = {}) {
  const navigation = [];
  const workspace = {
    ...publishDraft,
    userRole: "event_owner",
    hasRegistration: false,
    hasSurvey: false,
    surveyAccess: null,
    ...options.workspace,
  };
  const draft = { ...workspace, ...options.draft };
  const branding = { ...defaultEventBranding, primary: "#123456" };
  const draftKey = eventDraftKey("owner", seed.eventId, "th");
  const brandingKey = eventBrandingKey("owner", seed.eventId, "th");
  const saves = [];
  const publishRequests = [];
  const confirmations = [];
  const states = [];
  const messages = JSON.parse(
    fs.readFileSync(path.join(root, "src/messages/th.json")),
  );
  const noop = { default: () => null };
  const mocks = {
    "./publish/PublishChecklist": noop,
    "../workspace/EventWorkspacePageHeader": noop,
    "@/core/api": {
      ApiError: Error,
      api: { post: async (path, input) => {
        publishRequests.push({ path, input });
        if (options.publishFail) throw Error("API failure");
        return { publication: { draft, branding } };
      } },
    },
    "@/core/event/local-events": {
      eventSetupStateKey: () => "setup-state",
      notifyEventSetupSaved() {},
    },
    "@/core/event/schedule": load("src/core/event/schedule.ts"),
    "@/utils/alert": { showToast() {} },
    "@/components/event/setup/EventSetupBoundary": noop,
    "@/components/event/setup/EventSetupSteps": noop,
    "@/components/event/setup/EventSetupActions": { default: setupActions },
    "@/components/event/setup/EventSetupPendingMedia": noop,
    "@/components/ui/button/Button": { default: setupButton },
    "@/core/event/form-builder-navigation": load("src/core/event/form-builder-navigation.ts"),
    "@/core/event/form-summary": load("src/core/event/form-summary.ts"),
    "@/core/event/content": load("src/core/event/content.ts"),
    "@/core/event/draft": load("src/core/event/draft.ts"),
    "@/core/event/publication": load("src/core/event/publication.ts"),
    "@/hooks/useEventDraft": {
      default: () => ({
        draft,
        readOnly: options.readOnly ?? false,
        status: options.detailsStatus ?? "idle",
        save: () => {
          saves.push("draft");
          return saveEventDraft(draftKey, draft) === "saved";
        },
      }),
    },
    "@/hooks/useEventBranding": {
      default: () => ({
        branding,
        readOnly: options.readOnly ?? false,
        status: options.brandingStatus ?? "idle",
        change() {},
        save: () => {
          saves.push("branding");
          return saveEventBranding(brandingKey, branding) === "saved";
        },
      }),
    },
    "@/hooks/useEventFormSummaries": {
      default: () => ({
        forms: [],
        loading: false,
        error: options.formsError ?? false,
        retry() {},
      }),
    },
    "@/hooks/useParticipantPreviewLanguage": {
      default: () => ({ contentLocale: options.previewLocale ?? null }),
    },
    "@/hooks/useSetupApiState": { default: () => ({ pending: !!options.pending, getRevision: () => 3 }) },
    "@/hooks/useWhitelistNavigationGuard": noop,
    "@/hooks/useConfirm": {
      useConfirm: () => ({
        confirm: async (value) => {
          confirmations.push(value);
          assert.ok(globalThis.localStorage.getItem(brandingKey));
          assert.ok(restoreEventDraft(workspace, "owner", "th").hasLocalDraft);
          return options.confirm ?? true;
        },
      }),
    },
    "@/i18n/navigation": {
      useRouter: () => ({ push: (href) => navigation.push(href) }),
    },
    "@heroicons/react/24/outline": { ArrowRightIcon: () => null },
    "next-intl": {
      useTranslations: (namespace) => {
        const dictionary = namespace
          .split(".")
          .reduce((value, key) => value[key], messages);
        return (key) =>
          key.split(".").reduce((value, part) => value?.[part], dictionary) ??
          key;
      },
    },
    react: {
      ...require("react"),
      useState: (initial) => [
        typeof initial === "function" ? initial() : initial,
        (value) => states.push(value),
      ],
    },
  };
  for (const component of [
    "branding/BrandingAppearance",
    "branding/BrandingPreview",
    "forms/SetupFormCard",
    "forms/SetupFormsLoadingSkeleton",
    "publish/PublishFormSummary",
    "publish/PublishParticipantPreview",
  ])
    mocks[`@/components/event/setup/${component}`] = noop;
  const filename = {
    branding: "EventBrandingForm",
    forms: "EventFormsSetup",
    publish: "EventPublishPanel",
  }[kind];
  const Component = compileSetupComponent(
    `src/components/event/setup/${filename}.tsx`,
    mocks,
  );
  const props = { workspace, userId: "owner", locale: "th" };
  const entry = Component(props);
  const form = entry.props.component(props);
  const submit = async () => {
    let prevented = false;
    form.props.onSubmit({
      preventDefault() {
        prevented = true;
      },
    });
    assert.equal(prevented, true);
    await new Promise((resolve) => setImmediate(resolve));
  };
  return {
    form,
    ...setupActionButtons(form),
    navigation,
    saves,
    confirmations,
    publishRequests,
    states,
    submit,
    draftKey,
    brandingKey,
    branding,
    workspace,
  };
}
test("Branding and Forms Back/Next actions await saves before following their bounded routes", async (t) => {
  storage(t);
  for (const [kind, back, next] of [
    ["branding", "/event/details", "/event/forms"],
    ["forms", "/event/branding", "/event/publish"],
  ]) {
    for (const direction of ["back", "next"]) {
      const ui = setupStep(kind);
      assert.equal(ui.back.props.type, "button");
      assert.equal(ui.next.props.type, "submit");
      if (direction === "back") {
        ui.back.props.onClick();
        await new Promise((resolve) => setImmediate(resolve));
      }
      else await ui.submit();
      assert.deepEqual(ui.navigation, [direction === "back" ? back : next]);
      assert.deepEqual(
        ui.saves,
        kind === "branding" ? ["draft", "branding"] : ["draft"],
      );
      assert.equal(
        restoreEventDraft(ui.workspace, "owner", "th").hasLocalDraft,
        true,
      );
      if (kind === "branding")
        assert.deepEqual(loadEventBranding(ui.brandingKey), ui.branding);
    }
  }
});
test("Branding and Forms block both directions on validation/quota failures and Branding exposes either save error", async (t) => {
  storage(t);
  for (const kind of ["branding", "forms"]) {
    const invalid = setupStep(kind, {
      draft: { startsAt: "bad date" },
      detailsStatus: "invalid",
    });
    invalid.back.props.onClick();
    await invalid.submit();
    assert.deepEqual(invalid.navigation, []);
    assert.ok(invalid.feedback);
    assert.ok(!invalid.saves.includes("branding"));
  }
  const previous = { ...defaultEventBranding };
  const key = eventBrandingKey("owner", seed.eventId, "th");
  saveEventBranding(key, previous);
  const setItem = globalThis.localStorage.setItem;
  globalThis.localStorage.setItem = (key, value) => {
    if (key.includes("event-branding")) throw Error("QuotaExceededError");
    setItem(key, value);
  };
  const ui = setupStep("branding", { brandingStatus: "error" });
  ui.back.props.onClick();
  await ui.submit();
  assert.deepEqual(ui.navigation, []);
  assert.ok(ui.feedback);
  assert.deepEqual(loadEventBranding(key), previous);
  globalThis.localStorage.setItem = () => {
    throw Error("QuotaExceededError");
  };
  const forms = setupStep("forms");
  forms.back.props.onClick();
  await forms.submit();
  assert.deepEqual(forms.navigation, []);
});
test("Publish Back and Preview save the draft, while submit sends a separate confirmed API request", async (t) => {
  storage(t);
  const ui = setupStep("publish");
  ui.back.props.onClick();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(ui.navigation, ["/event/details"]);
  assert.deepEqual(ui.saves, ["draft", "branding"]);
  const preview = findSetupElement(
    ui.form,
    (node) => typeof node.props?.onOpen === "function",
  );
  assert.equal(await preview.props.onOpen(), true);
  assert.deepEqual(ui.saves, ["draft", "branding", "draft", "branding"]);
  assert.equal(
    loadPublication(publicationKey("owner", seed.eventId, "th")),
    null,
  );
  await ui.submit();
  assert.equal(ui.confirmations.length, 2);
  assert.deepEqual(ui.publishRequests, [{
    path: "/event/setup/publish",
    input: { eventId: ui.workspace.eventId, revision: 3, locale: "th" },
  }]);
  assert.equal(loadPublication(publicationKey("owner", seed.eventId, "th")), null);
  assert.equal(ui.workspace.eventStatus, "draft");
  assert.deepEqual(ui.navigation, ["/event/details", "/event/qr"]);
});
test("Details and both Publish Back actions keep the selected content language and respect the save guard", async (t) => {
  storage(t);
  const details = detailsActions(async () => true, new URLSearchParams("lang=ja"));
  details.form.props.onSubmit({ preventDefault() {} });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(details.navigation, ["/event/publish?lang=ja"]);

  for (const options of [{}, { pending: true }, { draft: { startsAt: "invalid" } }]) {
    const ui = setupStep("publish", { ...options, previewLocale: "ja" });
    const header = findSetupElement(ui.form, (node) => node.props?.description && node.props?.back);
    assert.ok(ui.back.props.children.includes(header.props.back.label));
    assert.equal(header.props.back.disabled, !!options.pending);
    for (const click of [header.props.back.onClick, ui.back.props.onClick]) {
      click();
      await new Promise((resolve) => setImmediate(resolve));
    }
    if (options.pending || options.draft) {
      assert.deepEqual(ui.navigation, []);
    } else {
      assert.deepEqual(ui.navigation, ["/event/details?lang=ja", "/event/details?lang=ja"]);
      assert.deepEqual(ui.saves, ["draft", "branding", "draft", "branding"]);
    }
  }
});
test("Publish does not create a receipt or report success after cancellation, storage/validation failures or denied access", async (t) => {
  storage(t);
  const key = publicationKey("owner", seed.eventId, "th");
  for (const options of [
    { confirm: false },
    { draft: { eventName: " " } },
    { formsError: true },
    { readOnly: true },
    { workspace: { userRole: "sub_user" } },
  ]) {
    const ui = setupStep("publish", options);
    await ui.submit();
    assert.equal(loadPublication(key), null);
    assert.ok(
      ui.confirmations.every(
        (value) => value.showCancel !== false || value.variant === "danger",
      ),
    );
    assert.deepEqual(ui.navigation, []);
  }
  globalThis.localStorage.setItem = () => {
    throw Error("QuotaExceededError");
  };
  const failed = setupStep("publish");
  failed.back.props.onClick();
  const preview = findSetupElement(
    failed.form,
    (node) => typeof node.props?.onOpen === "function",
  );
  assert.equal(await preview.props.onOpen(), false);
  await failed.submit();
  assert.deepEqual(failed.navigation, []);
  assert.deepEqual(failed.confirmations, []);
  assert.equal(loadPublication(key), null);
});

test("Publish preview opens the dialog only after saving succeeds", async () => {
  let opens = 0;
  let isOpen = false;
  const Display = () => null;
  const Gallery = () => null;
  const content = getEventContent(seed, "th");
  const language = { content, translation: content.translations[0], contentLocale: "th", selectLanguage() {} };
  const Preview = compileSetupComponent(
    "src/components/event/setup/publish/PublishParticipantPreview.tsx",
    {
      "@/components/event/setup/branding/BrandingPreviewGallery": { default: Gallery },
      "@/components/event/participant/ParticipantDisplayPreview": {
        default: Display,
      },
      "@/components/event/participant/ParticipantPreviewLanguage": { default: () => null },
      "@/core/event/draft": load("src/core/event/draft.ts"),
      "@/hooks/useModal": {
        useModal: () => ({ isOpen, openModal: () => opens++ }),
      },
      "@heroicons/react/24/outline": { EyeIcon: () => null, XMarkIcon: () => null },
      "next-intl": { useTranslations: () => (key) => key },
      react: {
        useState: (initial) => [initial, () => {}],
        useEffect() {},
        useId: () => "preview",
        useRef: () => ({ current: null }),
      },
    },
  );
  for (const saved of [false, true]) {
    let saves = 0;
    const screen = Preview({
      workspace: seed,
      draft: seed,
      language,
      branding: { ...defaultEventBranding, layout: "landscape" },
      onOpen: () => {
        saves++;
        return Promise.resolve(saved);
      },
    });
    const gallery = findSetupElement(screen, (node) => node.type === Gallery);
    assert.equal(gallery.props.workspace, seed);
    assert.equal(gallery.props.contentLocale, "th");
    const display = findSetupElement(gallery, (node) => node.type === Display);
    assert.equal(display.props.branding.layout, "landscape");
    assert.equal(display.props.contentLocale, "th");
    const trigger = findSetupElement(screen, (node) =>
      node.type === "button" && node.props["aria-haspopup"] === "dialog",
    );
    const opening = trigger.props.onClick();
    assert.equal(saves, 1);
    assert.equal(opens, 0);
    await opening;
    assert.equal(opens, saved ? 1 : 0);
  }
  isOpen = true;
  for (const layout of ["portrait", "square", "landscape"]) {
    const screen = Preview({
      workspace: seed,
      draft: seed,
      language,
      branding: { ...defaultEventBranding, layout },
      onOpen: () => true,
    });
    const dialog = findSetupElement(screen, (node) => node.type === "dialog");
    const gallery = findSetupElement(dialog, (node) => node.type === Gallery);
    assert.equal(gallery.props.workspace, seed);
    assert.equal(gallery.props.contentLocale, "th");
    const display = findSetupElement(gallery, (node) => node.type === Display);
    assert.equal(dialog.props["data-banner-layout"], layout);
    assert.equal(display.props.branding.layout, layout);
    assert.equal(display.props.contentLocale, "th");
  }
});

test("Publish checklist distinguishes absent values from existing invalid values", () => {
  const Checklist = compileSetupComponent(
    "src/components/event/setup/publish/PublishChecklist.tsx",
    {
      "@/core/event/banner-layout": load("src/core/event/banner-layout.ts"),
      "@/core/event/content": load("src/core/event/content.ts"),
      "@/core/event/form-builder-navigation": load("src/core/event/form-builder-navigation.ts"),
      "@/core/i18n/bangkok-datetime": load("src/core/i18n/bangkok-datetime.ts"),
      "./publish-view.css": {},
      "next/navigation": { useSearchParams: () => new URLSearchParams("lang=en") },
      "next-intl": { useLocale: () => "th", useTranslations: () => (key) => key },
    },
  );
  const draft = {
    ...publishDraft,
    eventName: "",
    startsAt: "2027-01-01T10:00:00.000Z",
    endsAt: "2027-01-01T09:00:00.000Z",
    hasRegistration: true,
  };
  const forms = { registration: null, survey: null };
  const navigation = [];
  const recheck = load("src/core/event/publication.ts").reviewPublication;
  const { issues, formProblems } = recheck(draft, forms);
  const checklist = Checklist({
    draft,
    branding: defaultEventBranding,
    issues,
    forms,
    formProblems,
    canEdit: true,
    canManageRegistration: true,
    onEdit: (href) => navigation.push(href),
  });
  const rows = checklist.props.children.flat().filter((node) => node.type === "button");
  const status = Object.fromEntries(rows.map((node) => [node.key, node.props["data-status"]]));
  assert.equal(status.eventName, "missing");
  assert.equal(status.location, "complete");
  assert.equal(status.start, "complete");
  assert.equal(status.end, "needs-edit");
  assert.equal(status.registration, "missing");
  rows.find((node) => node.key === "registration").props.onClick();
  assert.deepEqual(navigation, ["/event/setup/registration?from=publish&lang=en"]);
});

test("Event information configuration preserves field bindings, limits, labels, null values and read-only state", () => {
  const placeholder = () => null;
  const Fields = compileSetupComponent(
    "src/components/event/setup/details/EventInformationFields.tsx",
    {
      "@/components/form/DateTimePicker": { default: placeholder },
      "@/components/event/setup/details/EventLanguageDropdown": {
        default: placeholder,
      },
      "@/core/event/content": load("src/core/event/content.ts"),
      "@/core/i18n/bangkok-datetime": load("src/core/i18n/bangkok-datetime.ts"),
      "@/components/form/Label": { default: placeholder },
      "@/components/form/input/InputField": { default: placeholder },
      "next-intl": {
        useLocale: () => "th",
        useTranslations: () => (key) => key,
      },
    },
  );
  for (const readOnly of [false, true]) {
    const changes = [];
    const screen = Fields({
      draft: seed,
      uiLocale: "th",
      selectedLocale: null,
      onSelectLocale() {},
      readOnly,
      onChange: (value) => changes.push(value),
    });
    for (const [field, id, maxLength, source] of [
      ["title", "event-name", 255, "eventName"],
      ["description", "event-description", 5000, "description"],
      ["locationName", "event-location", 500, "locationName"],
      ["floorZone", "event-zone", 500, "locationDetail"],
      ["startsAt", "event-start"],
      ["endsAt", "event-end"],
    ]) {
      const input = findSetupElement(screen, (node) => node.props?.id === id);
      assert.equal(input.props.readOnly, readOnly);
      if (maxLength) {
        assert.equal(input.props.maxLength, maxLength);
        assert.equal(input.props.value, seed[source] ?? "");
        assert.ok(
          findSetupElement(screen, (node) => node.props?.htmlFor === id),
        );
        input.props.onChange({ target: { value: "Updated" } });
        assert.equal(changes.at(-1).content.translations[0][field], "Updated");
        assert.equal(changes.at(-1).content.translations[0].localeCode, "th");
      } else {
        assert.equal(input.props.value, null);
        assert.equal(input.props.blockPast, true);
        assert.equal(input.props.showBoundsHint, false);
        input.props.onChange("2027-01-01T03:00:00.000Z");
        assert.deepEqual(changes.at(-1), {
          [field]: "2027-01-01T03:00:00.000Z",
        });
      }
    }
  }
  const { emptyEventTranslation } = load("src/core/event/content.ts");
  const translated = {
    ...seed,
    content: {
      defaultLocale: "th",
      translations: ["th", "en"].map(emptyEventTranslation),
    },
  };
  for (const lang of ["th", "en"]) {
    const screen = Fields({
      draft: translated, uiLocale: "th", selectedLocale: lang,
      onSelectLocale() {}, readOnly: false, onChange() {},
    });
    for (const id of ["event-name", "event-location"]) {
      const field = findSetupElement(screen, (node) => node.props?.id === id);
      assert.equal(field.props.lang, lang);
    }
  }
  const changes = [];
  const selections = [];
  const screen = Fields({
    draft: translated, uiLocale: "th", selectedLocale: "en", readOnly: false,
    onSelectLocale: (locale) => selections.push(locale),
    onChange: (value) => changes.push(value),
  });
  const languageMenu = findSetupElement(screen, (node) => typeof node.props?.onRemove === "function");
  languageMenu.props.onRemove("th");
  assert.equal(changes.length, 0);
  languageMenu.props.onRemove("en");
  assert.deepEqual(changes, [{
    content: { defaultLocale: "th", translations: [translated.content.translations[0]] },
  }]);
  assert.deepEqual(selections, ["th"]);
});

test("Post Survey closes at the selected offset from the event end in Bangkok", () => {
  const { surveyClosingTime } = load("src/core/event/schedule.ts");
  const draft = { ...publishDraft, endsAt: "2027-01-31T23:30:00+07:00" };
  for (const [mode, expected] of [
    ["event", "2027-01-31T16:30:00.000Z"],
    ["week", "2027-02-07T16:30:00.000Z"],
    ["fortnight", "2027-02-14T16:30:00.000Z"],
    ["custom", "2027-02-01T19:30:00.000Z"],
  ])
    assert.equal(
      surveyClosingTime({
        ...draft,
        surveyCloseMode: mode,
        surveyCustomClose: "2027-02-01T19:30:00.000Z",
      }),
      expected,
    );
  assert.equal(surveyClosingTime({ ...draft, endsAt: null }), null);
  assert.equal(
    surveyClosingTime(draft),
    surveyClosingTime({ ...draft, surveyCloseMode: "event" }),
  );
  const movedEnd = "2027-05-01T10:00:00.000Z";
  assert.equal(surveyClosingTime({ ...draft, endsAt: movedEnd }), movedEnd);
});

test("the survey closing picker can restore a linked event end after a custom date", () => {
  const mocks = {
    "next-intl": { useTranslations: () => (key) => key },
    "@/core/event/schedule": load("src/core/event/schedule.ts"),
    "@/core/i18n/bangkok-datetime": load("src/core/i18n/bangkok-datetime.ts"),
  };
  const Picker = compileSetupComponent("src/components/event/setup/details/SurveyClosePicker.tsx", {
    ...mocks,
    react: { useState: (value) => [value, () => {}] },
    "@/components/form/DateTimePicker": { default: () => null },
  });
  const Schedule = compileSetupComponent("src/components/event/setup/details/EventFormSchedule.tsx", {
    ...mocks,
    "./SurveyClosePicker": { default: Picker },
  });
  let draft = {
    ...publishDraft, surveyCloseMode: "custom", surveyCustomClose: "2099-02-05T04:00:00.000Z",
  };
  function picker() {
    const schedule = Schedule({
      draft, readOnly: false, onChange: (updates) => { draft = { ...draft, ...updates }; },
    });
    return Picker(findSetupElement(schedule, (node) => node.type === Picker).props).props;
  }
  const custom = picker();
  assert.equal(custom.value, draft.surveyCustomClose);
  custom.popover.preset.onSelect();
  assert.equal(draft.surveyCloseMode, "event");
  assert.equal(picker().popover.displayValue, "withEvent");
  draft.endsAt = "2099-01-30T06:00:00.000Z";
  assert.equal(picker().value, draft.endsAt);
});

test("Publication reads the team Builder email question and its actual unique field", () => {
  const registration = formSummary("registration");
  const q = registration.questions[0].question;
  delete q.required;
  Object.assign(q, { type: "email", is_required: true, is_unique: true });
  const forms = { registration, survey: formSummary("survey") };
  assert.deepEqual(publicationIssues(publishDraft, forms), []);
  assert.ok(
    publicationIssues({ ...publishDraft, locationName: "  " }, forms).includes(
      "location",
    ),
  );
  q.is_unique = false;
  assert.ok(publicationIssues(publishDraft, forms).includes("uniqueField"));
  assert.ok(
    publicationIssues({ ...publishDraft, isPrivate: true }, forms).includes(
      "whitelist",
    ),
  );
});

test("All enabled-form combinations use only the definitions selected in Event Setup", () => {
  const forms = {
    registration: formSummary("registration"),
    survey: formSummary("survey"),
  };
  for (const hasRegistration of [false, true])
    for (const hasSurvey of [false, true]) {
      const draft = {
        ...publishDraft,
        hasRegistration,
        hasSurvey,
        surveyAccess: hasSurvey ? "public" : null,
      };
      assert.deepEqual(publicationIssues(draft, forms), []);
      assert.equal(
        publicationIssues(draft, { registration: null, survey: null }).includes(
          "formContent",
        ),
        hasRegistration || hasSurvey,
      );
    }
});

test("Banner orientation and branding material survive reload and invalid saves keep the previous version", (t) => {
  storage(t);
  const key = eventBrandingKey("owner", seed.eventId, "th");
  const value = {
    ...defaultEventBranding,
    layout: "landscape",
    organizer: "QA",
    identity: "wordmark",
    backgroundMode: "gradient",
    gradientAngle: 90,
    gradientEnd: "#004488",
    transparentChrome: true,
    channels: [{ platform: "Website", url: "https://example.org" }],
  };
  assert.equal(saveEventBranding(key, value), "saved");
  assert.deepEqual(loadEventBranding(key), value);
  assert.equal(
    saveEventBranding(key, {
      ...value,
      channels: [{ platform: "Website", url: "bad" }],
    }),
    "invalid",
  );
  assert.deepEqual(loadEventBranding(key), value);
});

test("Registration and Survey capacity accept only positive whole digits, with blank meaning unlimited", () => {
  const Capacity = compileSetupComponent(
    "src/components/event/setup/details/EventCapacitySettings.tsx",
    {
      "@/components/form/input/InputField": { default: () => null },
      "next-intl": { useTranslations: () => (key) => key },
      react: { useId: () => "capacity", useState: (value) => [value, () => {}] },
    },
  );
  for (const kind of ["registration", "survey"]) {
    const changes = [];
    const view = Capacity({
      kind,
      capacity: 200,
      readOnly: false,
      onChange: (value) => changes.push(value),
    });
    const input = findSetupElement(
      view,
      (node) => node.props.inputMode === "numeric",
    );
    assert.equal(input.props.value, "200");
    for (const value of ["1e2", "2.5", "-3", "0", "9007199254740992"]) {
      input.props.onChange({ currentTarget: { value } });
    }
    assert.deepEqual(changes, []);
    input.props.onChange({ currentTarget: { value: "500" } });
    input.props.onChange({ currentTarget: { value: "" } });
    assert.deepEqual(changes, [500, null]);
  }
});

test("Private access leaves the Registration switch editable and shows the relevant Whitelist action", () => {
  const noop = { default: () => null };
  const changes = [];
  const Access = compileSetupComponent(
    "src/components/event/setup/details/EventAccessSettings.tsx",
    {
      "./EventCapacitySettings": noop,
      "@/components/form/switch/Switch": noop,
      "@/components/ui/button/Button": noop,
      "@/hooks/useConfirm": {
        useConfirm: () => ({ confirm: async () => true }),
      },
      "next-intl": { useTranslations: () => (key) => key },
    },
  );
  const render = (isPrivate, hasRegistration, readOnly = false) =>
    Access({
      draft: { ...seed, isPrivate, hasRegistration, surveyAccess: "public" },
      workspace: { canManageWhitelist: true },
      readOnly,
      onChange: (value) => changes.push(value),
      onOpenWhitelist: () => {},
    });
  const publicView = render(false, false);
  const privateOption = findSetupElement(
    publicView,
    (node) => node.type === "button" && node.props.children === "private",
  );
  privateOption.props.onClick();
  assert.deepEqual(changes.pop(), { isPrivate: true });
  assert.equal(
    findSetupElement(
      publicView,
      (node) => node.props.children === "privateRegistrationHint",
    ),
    null,
  );

  const noRegistration = render(true, false);
  assert.ok(
    findSetupElement(
      noRegistration,
      (node) => node.props.children === "privateRegistrationHint",
    ),
  );
  assert.equal(
    findSetupElement(
      noRegistration,
      (node) => node.props.children === "manageWhitelist",
    ),
    null,
  );

  const enabled = render(true, true);
  const registrationToggle = findSetupElement(
    enabled,
    (node) => node.props.id === "registration-on",
  );
  assert.equal(registrationToggle.props.disabled, false);
  registrationToggle.props.onChange(false);
  assert.deepEqual(changes.pop(), { hasRegistration: false });
  assert.equal(
    findSetupElement(
      enabled,
      (node) => node.props.children === "manageWhitelist",
    ).props.disabled,
    false,
  );
  const readOnly = render(true, true, true);
  assert.equal(
    findSetupElement(
      readOnly,
      (node) => node.props.children === "manageWhitelist",
    ).props.disabled,
    true,
  );
});

test("workspace navigation preserves form management, guards dirty Whitelist links and highlights the active page", async () => {
  const link = () => null;
  const render = (
    userRole,
    localPublishedAt,
    pathname,
    canAccessDashboard = false,
    confirmLeave = null,
    push = () => {},
    canAccessForms = true,
    closeMobileSidebar,
    whitelistSettings = {},
  ) => {
    const Sidebar = compileSetupComponent(
      "src/components/event/workspace/EventWorkspaceSidebar.tsx",
      {
        "next/image": { default: () => null },
        "next-intl": { useTranslations: () => (key) => key },
        "@/context/AuthContext": { useAuth: () => ({ user: null }) },
        "@/utils/i18n-labels": load("src/utils/i18n-labels.ts"),
        "@/context/SidebarContext": {
          useSidebar: () => ({
            isExpanded: !closeMobileSidebar,
            isMobileOpen: !!closeMobileSidebar,
            closeMobileSidebar,
          }),
        },
        "@/core/event/public-event-paths": load(
          "src/core/event/public-event-paths.ts",
        ),
        "@/core/event/whitelist": load("src/core/event/whitelist.ts"),
        "@/i18n/navigation": {
          Link: link,
          usePathname: () => pathname,
          useRouter: () => ({ push }),
        },
        "./EventNavigationGuard": {
          useEventNavigationGuard: () => ({ current: confirmLeave }),
        },
        "./EventWorkspaceChrome.module.css": { default: {} },
      },
    );
    return Sidebar({
      loading: false,
      workspace: { userRole, localPublishedAt, canAccessDashboard, canAccessForms, ...whitelistSettings },
    });
  };
  const team = (node) =>
    node.type === link && node.props.href === "/event/team";
  const disabledTeam = (node) =>
    node.type === "button" && node.props["aria-label"] === "team" &&
    node.props.disabled;
  const overview = (node) =>
    node.type === link && node.props["aria-label"] === "overview";
  const dashboard = (node) =>
    node.type === link && node.props.href === "/event/dashboard";
  const formManagement = (node) =>
    node.type === link && node.props.href === "/event/form";
  const whitelist = (node) =>
    node.type === link && node.props.href === "/event/whitelist";
  const registrationManager = {
    eventStatus: "draft", canManageWhitelist: true, whitelistEnabledForSetup: true, canEditEvent: false,
  };
  const renderWhitelistSidebar = (overrides) => render(
    "sub_user", null, "/event/whitelist", false, null, undefined, true, undefined,
    { ...registrationManager, ...overrides },
  );
  assert.equal(findSetupElement(renderWhitelistSidebar(), whitelist).props["aria-current"], "page");
  assert.equal(findSetupElement(renderWhitelistSidebar(), overview).props["aria-current"], undefined);
  for (const overrides of [
    { canManageWhitelist: false }, { whitelistEnabledForSetup: false }, { eventStatus: "closed" },
  ]) {
    assert.equal(findSetupElement(renderWhitelistSidebar(overrides), whitelist), null);
  }
  for (const pathname of ["/event", "/event/qr", "/event/team"]) {
    const owner = render("event_owner", "2027-01-01T00:00:00.000Z", pathname);
    assert.equal(
      findSetupElement(owner, team).props["aria-current"],
      pathname === "/event/team" ? "page" : undefined,
    );
    assert.equal(
      findSetupElement(owner, overview).props["aria-current"],
      pathname === "/event" ? "page" : undefined,
    );
    assert.equal(findSetupElement(owner, formManagement).props["aria-label"], "Form");
  }
  assert.ok(findSetupElement(render("sub_user", null, "/event"), formManagement));
  for (const pathname of [
    "/event/form",
    "/event/form/registration",
    "/event/form/survey",
  ]) {
    const sidebar = render("sub_user", null, pathname);
    assert.equal(findSetupElement(sidebar, formManagement).props["aria-current"], "page");
    assert.equal(findSetupElement(sidebar, overview).props["aria-current"], undefined);
  }
  assert.equal(
    findSetupElement(
      render("sub_user", null, "/event", false, null, () => {}, false),
      formManagement,
    ),
    null,
  );
  for (const publishedAt of [null, "2027-01-01T00:00:00.000Z"]) {
    const subUser = render("sub_user", publishedAt, "/event");
    assert.equal(findSetupElement(subUser, team), null);
    assert.ok(findSetupElement(subUser, disabledTeam));
  }
  const draftOwner = render("event_owner", null, "/event");
  assert.ok(findSetupElement(draftOwner, team));
  assert.equal(findSetupElement(draftOwner, (node) => node.props.href === "/event/qr"), null);
  assert.equal(
    findSetupElement(render("event_owner", "2027-01-01", "/event"), dashboard),
    null,
  );
  for (const pathname of [
    "/event/dashboard",
    "/event/dashboard/builder",
    "/event/responses",
    "/event/exports",
  ]) {
    const owner = render("event_owner", null, pathname, true);
    assert.equal(findSetupElement(owner, dashboard).props["aria-current"], "page");
    assert.equal(findSetupElement(owner, overview).props["aria-current"], undefined);
    assert.ok(findSetupElement(owner, formManagement));
  }

  let prompts = 0;
  let cancelled = 0;
  const locations = [];
  const drawerClosures = [];
  const closeDrawer = (restoreFocus = false) => drawerClosures.push(restoreFocus);
  const navigation = { preventDefault: () => { cancelled++; } };
  const sidebarForWhitelist = (approved) => render(
    "event_owner", null, "/event/whitelist", false,
    approved === null ? null : async () => { prompts++; return approved; },
    (href) => locations.push(href),
    true,
    closeDrawer,
  );
  findSetupElement(sidebarForWhitelist(null), overview).props.onNavigate(navigation);
  assert.equal(cancelled, 0);
  assert.deepEqual(drawerClosures, [false]);

  findSetupElement(sidebarForWhitelist(false), overview).props.onNavigate(navigation);
  await Promise.resolve();
  assert.deepEqual(locations, []);
  assert.deepEqual(drawerClosures, [false]);

  findSetupElement(sidebarForWhitelist(true), formManagement).props.onNavigate(navigation);
  await Promise.resolve();
  assert.equal(prompts, 2);
  assert.equal(cancelled, 2);
  assert.deepEqual(locations, ["/event/form"]);
  assert.deepEqual(drawerClosures, [false, false]);

  const currentPage = render(
    "sub_user", null, "/event/form", false, null, undefined, true, closeDrawer,
  );
  findSetupElement(currentPage, formManagement).props.onNavigate(navigation);
  assert.equal(cancelled, 3);
  assert.deepEqual(drawerClosures, [false, false, true]);
});

function multilingualDraft() {
  return {
    ...publishDraft,
    hasRegistration: false,
    hasSurvey: false,
    surveyAccess: null,
    content: {
      defaultLocale: "th",
      translations: [
        {
          ...emptyEventTranslation("th"),
          title: "งานหนังสือ",
          locationName: "กรุงเทพ",
        },
        {
          ...emptyEventTranslation("en"),
          title: "Book Fair",
          locationName: "Bangkok",
        },
        {
          ...emptyEventTranslation("ko"),
          title: "도서전",
          locationName: "방콕",
          floorZone: "2층",
        },
      ],
    },
  };
}

test("Event content accepts ISO 639-1 languages, normalizes casing, and rejects duplicates and invalid defaults", () => {
  assert.equal(normalizeContentLocale(" DE "), "de");
  for (const bad of ["jp", "ZZ", "fr-CA", "deu", "", null, ["ko"]])
    assert.equal(normalizeContentLocale(bad), null);
  const { content } = multilingualDraft();
  const last = content.translations.at(-1);
  assert.equal(
    eventContentSchema.parse({
      ...content,
      defaultLocale: "KO",
      translations: [
        ...content.translations.slice(0, -1),
        { ...last, localeCode: "KO" },
      ],
    }).defaultLocale,
    "ko",
  );
  assert.equal(
    eventContentSchema.safeParse({
      ...content,
      translations: [...content.translations, { ...last, localeCode: "KO" }],
    }).success,
    false,
  );
  assert.equal(
    eventContentSchema.safeParse({ ...content, defaultLocale: "de" }).success,
    false,
  );
  assert.equal(resolveEventTranslation(content, "KO").floorZone, "2층");
  assert.equal(resolveEventTranslation(content, "fr").title, "งานหนังสือ");
  assert.equal(resolveEventTranslation(content, "en").floorZone, null);
});

test("Shared Draft restores every language across portal locales and responds to scoped save and storage events", (t) => {
  const values = storage(t);
  const target = setupWindow(t);
  const base = multilingualDraft();
  const key = eventDraftV2Key("owner", seed.eventId);
  let restored;
  const unsubscribe = subscribeToEventSetup([key], () => {
    restored = restoreLocalEventWorkspace(base, "owner", "en");
  });
  t.after(unsubscribe);
  const draft = {
    ...base,
    content: {
      ...base.content,
      translations: [...base.content.translations, emptyEventTranslation("de")],
    },
  };
  assert.equal(saveEventDraft(key, draft), "saved");
  assert.equal(restored.eventName, "Book Fair");
  assert.equal(restored.content.translations.at(-1).localeCode, "de");
  assert.equal(
    restoreLocalEventWorkspace(base, "owner", "th").eventName,
    "งานหนังสือ",
  );
  assert.equal(
    restoreLocalEventWorkspace(base, "other-user", "en").content.translations
      .length,
    3,
  );
  assert.equal(
    restoreLocalEventWorkspace({ ...base, eventId: "other" }, "owner", "en")
      .content.translations.length,
    3,
  );
  const invalid = {
    ...draft,
    content: { ...draft.content, defaultLocale: "zz" },
  };
  assert.equal(saveEventDraft(key, invalid), "invalid");
  assert.equal(restored.content.translations.length, 4);
  values.set(key, JSON.stringify(base));
  dispatchStorage(target, key, globalThis.localStorage);
  assert.equal(restored.content.translations.length, 3);
});

test("V1 Draft migration keeps localized text and uses the default locale copy for shared settings", (t) => {
  const values = storage(t);
  const base = multilingualDraft();
  const thKey = eventDraftKey("owner", seed.eventId, "th");
  const enKey = eventDraftKey("owner", seed.eventId, "en");
  assert.equal(
    saveEventDraft(thKey, {
      ...publishDraft,
      isPrivate: true,
      eventName: "แก้ภาษาไทย",
    }),
    "saved",
  );
  assert.equal(
    saveEventDraft(enKey, {
      ...publishDraft,
      isPrivate: false,
      eventName: "Edited English",
    }),
    "saved",
  );
  const originals = [values.get(thKey), values.get(enKey)];
  const restored = restoreEventDraft(base, "owner", "en");
  assert.equal(restored.eventName, "Edited English");
  assert.equal(restored.isPrivate, true);
  assert.equal(
    resolveEventTranslation(restored.content, "th").title,
    "แก้ภาษาไทย",
  );
  assert.equal(
    resolveEventTranslation(restored.content, "ko").floorZone,
    "2층",
  );
  assert.deepEqual([values.get(thKey), values.get(enKey)], originals);
});

test("V1 fallback text does not manufacture a new translation when only shared settings were saved", (t) => {
  storage(t);
  const base = multilingualDraft();
  base.content.translations.splice(1, 1);
  const thai = resolveEventTranslation(base.content, "th");
  const legacy = {
    ...publishDraft,
    isPrivate: true,
    eventName: thai.title,
    description: thai.description,
    locationName: thai.locationName,
  };
  assert.equal(
    saveEventDraft(eventDraftKey("owner", seed.eventId, "en"), legacy),
    "saved",
  );
  const restored = restoreEventDraft(base, "owner", "th");
  assert.equal(restored.isPrivate, true);
  assert.deepEqual(
    restored.content.translations.map(({ localeCode }) => localeCode),
    ["th", "ko"],
  );
});

test("Legacy bilingual records restore their actual alternate text and floor or zone", (t) => {
  storage(t);
  const base = multilingualDraft();
  const legacy = {
    ...publishDraft,
    eventName: "งานไทย",
    locationName: "กรุงเทพ",
    locationDetail: "ชั้น 1",
    alternateContent: {
      eventName: "Previously entered English",
      description: "English event description",
      locationName: "Bangkok",
      locationDetail: "Hall A",
    },
  };
  assert.equal(
    saveEventDraft(eventDraftKey("owner", seed.eventId, "th"), legacy),
    "saved",
  );
  const restored = restoreEventDraft(base, "owner", "en");
  assert.equal(restored.eventName, "Previously entered English");
  assert.equal(restored.locationDetail, "Hall A");
  assert.equal(resolveEventTranslation(restored.content, "th").floorZone, "ชั้น 1");
  assert.equal(
    saveEventDraft(eventDraftKey("owner", seed.eventId, "en"), {
      ...publishDraft,
      eventName: "Explicit English draft",
      locationName: "Bangkok",
      locationDetail: "Hall B",
    }),
    "saved",
  );
  const explicit = restoreEventDraft(base, "owner", "en");
  assert.equal(explicit.eventName, "Explicit English draft");
  assert.equal(explicit.locationDetail, "Hall B");
});

test("Publishing reports missing fields per language and freezes the full multilingual content", async (t) => {
  storage(t);
  const base = multilingualDraft();
  const forms = { registration: null, survey: null };
  const incomplete = {
    ...base,
    content: {
      ...base.content,
      translations: [...base.content.translations, emptyEventTranslation("de")],
    },
  };
  assert.deepEqual(publicationIssues(incomplete, forms), [
    { key: "contentTitle", localeCode: "de" },
    { key: "contentVenue", localeCode: "de" },
  ]);
  const receipt = {
    publishedAt: "2027-01-01T01:00:00.000Z",
    draft: base,
    branding: defaultEventBranding,
    forms,
  };
  assert.equal(
    await saveEventPublication("owner", seed.eventId, "en", {
      ...receipt,
      draft: incomplete,
    }),
    false,
  );
  assert.equal(
    await saveEventPublication("owner", seed.eventId, "en", receipt),
    true,
  );
  assert.equal(
    await saveEventPublication("owner", seed.eventId, "th", receipt),
    false,
  );
  assert.deepEqual(
    loadPublication(publicationV2Key("owner", seed.eventId)).draft.content,
    base.content,
  );
  saveEventDraft(eventDraftV2Key("owner", seed.eventId), incomplete);
  const published = restoreLocalEventWorkspace(base, "owner", "th");
  assert.equal(published.eventStatus, base.eventStatus);
  assert.equal(published.localPublishedAt, receipt.publishedAt);
  assert.equal(canEditLocalEventSetup(published), false);
  assert.equal(
    restoreLocalEventWorkspace(base, "owner", "en").eventName,
    "Book Fair",
  );
  assert.equal(loadEventPublication("other-user", seed.eventId, "en"), null);
  assert.deepEqual(published.content, base.content);
});

test("Legacy publication remains frozen and available to the shared setup across UI locales", (t) => {
  const values = storage(t);
  const base = multilingualDraft();
  const key = publicationKey("owner", seed.eventId, "en");
  const { content, ...legacy } = base;
  const receipt = {
    publishedAt: "2027-01-01T01:00:00.000Z",
    draft: { ...legacy, eventName: "Originally published" },
    branding: defaultEventBranding,
    forms: { registration: null, survey: null },
  };
  values.set(key, JSON.stringify(receipt));
  const raw = values.get(key);
  const published = restoreLocalEventWorkspace(
    { ...base, content },
    "owner",
    "th",
  );
  assert.equal(published.eventName, "Originally published");
  assert.equal(published.localPublishedAt, receipt.publishedAt);
  assert.equal(canEditLocalEventSetup(published), false);
  assert.deepEqual(
    published.content.translations.map(({ localeCode }) => localeCode),
    ["en"],
  );
  assert.equal(values.get(key), raw);
});

test("Full Preview keeps valid content language and bounded origins", () => {
  const { participantPreviewHref, participantPreviewReturnHref } = load(
    "src/core/event/participant.ts",
  );
  assert.equal(
    participantPreviewHref("publish", " DE "),
    "/preview/event?from=publish&lang=de",
  );
  assert.equal(
    participantPreviewHref("branding", "ko"),
    "/preview/event?lang=ko",
  );
  assert.equal(
    participantPreviewHref("publish", "zz"),
    "/preview/event?from=publish",
  );
  assert.equal(participantPreviewHref("branding"), "/preview/event");
  assert.equal(
    participantPreviewReturnHref("branding", "fr"),
    "/event/branding?lang=fr",
  );
  assert.equal(
    participantPreviewReturnHref("publish", "en-CA"),
    "/event/publish",
  );
});
