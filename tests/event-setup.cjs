/* eslint-disable @typescript-eslint/no-require-imports -- Standalone harness matches published dashboard tests; no new test dependency. */
// Run: node --test tests/event-setup.cjs
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
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
const { eventDraftKey, eventDraftSchema, restoreEventDraft, saveEventDraft } =
  load("src/core/event/draft.ts");
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
  mockApi.get = async (query) => {
    const url = new URL(query, "https://fixture.invalid");
    if (url.pathname.startsWith("/users/"))
      return users.find(
        (user) => user.id === decodeURIComponent(url.pathname.slice(7)),
      );
    if (url.pathname === "/role_permissions")
      return url.searchParams.get("role_id") === "owner-role"
        ? [{ permission: "manage_sub_user" }, { permission: "manage_event" }]
        : [];
    if (url.pathname === "/events/event-a")
      return {
        id: "event-a",
        slug: "event",
        status: "draft",
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
          title: "กิจกรรม",
          description: "รายละเอียด",
          location_name: "กรุงเทพ",
        },
        {
          event_id: "event-a",
          locale_code: "en",
          title: "Event",
          description: "Description",
          location_name: "Bangkok",
        },
      ];
    if (url.pathname === "/roles")
      return [
        { id: "owner-role", name: "Owner" },
        { id: "assistant-role", name: "Assistant role" },
      ];
    if (url.pathname === "/users")
      return users.filter(
        (user) => user.event_id === url.searchParams.get("event_id"),
      );
    if (url.pathname === "/event_banners") return [];
    if (url.pathname === "/event_form_settings")
      return [
        { form_type: "registration", is_unlimited: false, capacity: 200 },
      ];
    throw new Error(`Unexpected fixture query: ${query}`);
  };
  const { getEventWorkspace } = load("src/services/event/workspace.ts");
  const workspace = await getEventWorkspace("owner", "th");
  assert.equal(workspace.eventName, "กิจกรรม");
  assert.equal(workspace.registrationCapacity, 200);
  assert.equal(workspace.canEditEvent, true);
  assert.deepEqual(workspace.subUsers, [
    { id: "assistant", name: "Assistant" },
  ]);
  assert.equal(workspace.subUserCount, 1);
  assert(!JSON.stringify(workspace).includes("secret-"));
  const assistant = await getEventWorkspace("assistant", "en");
  assert.equal(assistant.eventName, "Event");
  assert.equal(assistant.canEditEvent, false);
  assert.deepEqual(assistant.subUsers, []);
  assert.equal(await getEventWorkspace("unassigned", "th"), null);
});

const {
  defaultEventBranding,
  eventBrandingKey,
  eventBrandingSchema,
  loadEventBranding,
  saveEventBranding,
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
const {
  IMAGE_MAX_INPUT_BYTES,
  imageUploadError,
  fitImageDimensions,
  convertImageToWebp,
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
      naturalWidth = 3000;
      naturalHeight = 4000;
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
test("image utility returns WebP data, keeps alpha/orientation and releases bitmap/canvas resources", async (t) => {
  const { calls, canvas } = imageBrowser(t);
  const result = await convertImageToWebp(
    new File(["input"], "photo.JPG", { type: "image/jpeg" }),
  );
  assert.equal(result.name, "photo.webp");
  assert.match(result.url, /^data:image\/webp;base64,/);
  assert.equal(result.type, "image/webp");
  assert.equal(result.size, 60);
  assert.deepEqual(
    { width: result.width, height: result.height },
    { width: 1200, height: 1600 },
  );
  assert.deepEqual(calls.alpha, { alpha: true });
  assert.equal(calls.orientation, "from-image");
  assert.deepEqual(calls.draws[0], [0, 0, 1200, 1600]);
  assert.equal(calls.closed, 1);
  assert.deepEqual([canvas.width, canvas.height], [0, 0]);
});
test("image compression reduces quality then dimensions and respects its output budget", async (t) => {
  const { calls } = imageBrowser(t, { sizes: [200, 200, 200, 200, 60] });
  const result = await convertImageToWebp(
    new File(["input"], "banner.png", { type: "image/png" }),
    { maxOutputBytes: 100 },
  );
  assert.equal(result.size, 60);
  assert.equal(calls.encodes.length, 5);
  assert.ok(calls.encodes[1].quality < calls.encodes[0].quality);
  assert.ok(calls.encodes[4].width < calls.encodes[0].width);
  assert.ok(calls.encodes.every((c) => c.type === "image/webp"));
});
test("unsupported WebP output is rejected instead of saving a PNG with a webp filename", async (t) => {
  const { calls } = imageBrowser(t, { outputType: "image/png" });
  await assert.rejects(
    convertImageToWebp(new File(["input"], "logo.png", { type: "image/png" })),
    { code: "fileConvert" },
  );
  assert.equal(calls.closed, 1);
});
test("image conversion has a bounded retry count and reports oversized output", async (t) => {
  const { calls } = imageBrowser(t, { sizes: [200] });
  await assert.rejects(
    convertImageToWebp(new File(["input"], "logo.png", { type: "image/png" }), {
      maxOutputBytes: 100,
    }),
    { code: "fileOutputSize" },
  );
  assert.equal(calls.encodes.length, 16);
  assert.equal(calls.closed, 1);
});
test("cancelled conversion cannot return a result and still closes its decoded bitmap", async (t) => {
  const controller = new AbortController();
  const { calls } = imageBrowser(t, { abortOnDecode: controller });
  await assert.rejects(
    convertImageToWebp(new File(["input"], "logo.png", { type: "image/png" }), {
      signal: controller.signal,
    }),
    { code: "aborted" },
  );
  assert.equal(calls.closed, 1);
  assert.equal(calls.encodes.length, 0);
});
test("SVG/browser decoder fallback revokes its object URL after conversion", async (t) => {
  const { calls } = imageBrowser(t, { bitmapError: true });
  const result = await convertImageToWebp(
    new File(["input"], "logo.svg", { type: "image/svg+xml" }),
  );
  assert.equal(result.name, "logo.webp");
  assert.deepEqual(calls.revoked, calls.urls);
  assert.equal(calls.imageCleared, true);
});
test("unreadable image fallback reports an error and never leaks its temporary URL", async (t) => {
  const { calls } = imageBrowser(t, { bitmapError: true, decodeError: true });
  await assert.rejects(
    convertImageToWebp(
      new File(["not-image"], "broken.png", { type: "image/png" }),
    ),
    { code: "fileRead" },
  );
  assert.deepEqual(calls.revoked, calls.urls);
  assert.equal(calls.encodes.length, 0);
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

test("continuous color picker round-trips arbitrary colors and the complete HSV range", () => {
  const { hexToHsv, hsvToHex } = load("src/core/event/branding-colors.ts");
  for (const color of [
    "#000000",
    "#FFFFFF",
    "#FF0000",
    "#00FF00",
    "#0000FF",
    "#1279BD",
    "#DB2777",
    "#4D80E8",
    "#ABCDEF",
  ])
    assert.equal(hsvToHex(hexToHsv(color)), color);
  assert.equal(hsvToHex({ hue: 360, saturation: 1, brightness: 1 }), "#FF0000");
  assert.equal(hsvToHex({ hue: 120, saturation: 1, brightness: 1 }), "#00FF00");
  assert.equal(hsvToHex({ hue: 240, saturation: 1, brightness: 1 }), "#0000FF");
  assert.equal(
    hsvToHex({ hue: 47.3, saturation: 0, brightness: 0.5 }),
    "#808080",
  );
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
test("Color Picker translations have matching nested keys", () => {
  const th = JSON.parse(
    fs.readFileSync(path.join(root, "src/messages/th.json")),
  ).eventBranding.colorPicker;
  const en = JSON.parse(
    fs.readFileSync(path.join(root, "src/messages/en.json")),
  ).eventBranding.colorPicker;
  assert.deepEqual(Object.keys(th).sort(), Object.keys(en).sort());
  assert.deepEqual(Object.keys(th.hues).sort(), Object.keys(en.hues).sort());
  assert.equal(th.hint, "ลากเลือกสี ปรับ Hue หรือกรอก HEX");
  assert.equal(th.done, "เสร็จสิ้น");
});

const { publicationIssues, publicationKey, savePublication, loadPublication } =
  load("src/core/event/publication.ts");
const { canEditLocalEventSetup } = load("src/core/event/draft.ts");
const { setupFormStatus, selectSetupForms } = load(
  "src/core/event/form-summary.ts",
);
const publishDraft = {
  ...seed,
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
test("Whitelist storage is isolated and invalid saves, corrupt data or storage failures never overwrite valid entries", (t) => {
  const values = storage(t);
  const key = whitelist.whitelistKey("owner", "event-a", "th");
  const entries = [whitelistEntry("one@example.com")];
  assert.equal(whitelist.saveWhitelist(key, entries), "saved");
  const before = values.get(key);
  assert.equal(
    whitelist.saveWhitelist(key, [
      ...entries,
      { ...entries[0], id: "another" },
    ]),
    "invalid",
  );
  assert.equal(values.get(key), before);
  assert.deepEqual(whitelist.loadWhitelist(key).entries, entries);
  assert.equal(
    whitelist.loadWhitelist(whitelist.whitelistKey("other", "event-a", "th"))
      .entries.length,
    0,
  );
  assert.equal(
    whitelist.loadWhitelist(whitelist.whitelistKey("owner", "event-b", "th"))
      .entries.length,
    0,
  );
  assert.equal(
    whitelist.loadWhitelist(whitelist.whitelistKey("owner", "event-a", "en"))
      .entries.length,
    0,
  );
  values.set("corrupt", "{broken");
  assert.equal(whitelist.loadWhitelist("corrupt").error, true);
  globalThis.localStorage.setItem = () => {
    throw Error("QuotaExceededError");
  };
  assert.equal(whitelist.saveWhitelist(key, []), "error");
  assert.equal(values.get(key), before);
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
const { subscribeToEventSetup } = load("src/core/event/local-events.ts");
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
function setupActionButtons(form) {
  const element = findSetupElement(form, (node) => node.type === setupActions);
  const footer = setupActions(element.props);
  const actions = footer.props.children.at(-1);
  const [back, next] = actions.props.children.map((node) =>
    node.type(node.props),
  );
  return { back, next, feedback: element.props.error };
}
function detailsActions(save) {
  const navigation = [];
  const noop = { default: () => null };
  const messages = JSON.parse(
    fs.readFileSync(path.join(root, "src/messages/th.json")),
  ).eventHome.details;
  const Details = compileSetupComponent(
    "src/components/event/setup/EventDetailsForm.tsx",
    {
      "@/components/event/setup/EventSetupSteps": noop,
      "@/components/event/setup/EventAccessSettings": noop,
      "@/components/event/setup/EventInformationFields": noop,
      "@/components/event/setup/EventSetupActions": { default: setupActions },
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
      "next-intl": { useTranslations: () => (key) => messages[key] ?? key },
    },
  );
  const form = Details({ workspace: seed, userId: "owner", locale: "th" });
  return { form, ...setupActionButtons(form), navigation };
}
test("Details Back and Next save edited form choices before navigation; native submit follows Next", (t) => {
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
    assert.equal(ui.back.props.children[1], "ย้อนกลับ");
    assert.equal(ui.next.props.children[1], "ถัดไป · Branding");
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
    assert.equal(saves, 1);
    assert.deepEqual(ui.navigation, [
      direction === "back" ? "/event" : "/event/branding",
    ]);
    const saved = restoreEventDraft(seed, "owner", "th");
    assert.equal(saved.eventName, "Latest edit");
    assert.equal(saved.hasRegistration, false);
    assert.equal(saved.surveyAccess, "public");
  }
});
test("Details Back and Next stay on the current page when validation or LocalStorage fails", (t) => {
  const values = storage(t);
  const key = eventDraftKey("owner", seed.eventId, "th");
  saveEventDraft(key, seed);
  const previous = values.get(key);
  const ui = detailsActions(
    () => saveEventDraft(key, { ...seed, startsAt: "invalid" }) === "saved",
  );
  ui.back.props.onClick();
  ui.form.props.onSubmit({ preventDefault() {} });
  assert.deepEqual(ui.navigation, []);
  const quota = detailsActions(
    () => saveEventDraft(key, { ...seed, hasSurvey: false }) === "saved",
  );
  globalThis.localStorage.setItem = () => {
    throw Error("QuotaExceededError");
  };
  quota.back.props.onClick();
  quota.form.props.onSubmit({ preventDefault() {} });
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
  const confirmations = [];
  const states = [];
  const messages = JSON.parse(
    fs.readFileSync(path.join(root, "src/messages/th.json")),
  );
  const noop = { default: () => null };
  const mocks = {
    "@/components/event/setup/EventSetupBoundary": noop,
    "@/components/event/setup/EventSetupSteps": noop,
    "@/components/event/setup/EventSetupActions": { default: setupActions },
    "@/components/ui/button/Button": { default: setupButton },
    "@/core/event/form-summary": load("src/core/event/form-summary.ts"),
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
    "BrandingAppearance",
    "BrandingPreview",
    "SetupFormCard",
    "PublishFormSummary",
    "PublishParticipantPreview",
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
  const form = kind === "branding" ? entry : entry.props.component(props);
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
    states,
    submit,
    draftKey,
    brandingKey,
    branding,
    workspace,
  };
}
test("Branding and Forms Back/Next actions save current local data before following their bounded routes", async (t) => {
  storage(t);
  for (const [kind, back, next] of [
    ["branding", "/event/details", "/event/forms"],
    ["forms", "/event/branding", "/event/publish"],
  ]) {
    for (const direction of ["back", "next"]) {
      const ui = setupStep(kind);
      assert.equal(ui.back.props.type, "button");
      assert.equal(ui.next.props.type, "submit");
      if (direction === "back") ui.back.props.onClick();
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
test("Publish Back and Preview save current data, while submit validates and confirms before a local receipt", async (t) => {
  storage(t);
  const ui = setupStep("publish");
  ui.back.props.onClick();
  assert.deepEqual(ui.navigation, ["/event/forms"]);
  assert.deepEqual(ui.saves, ["draft", "branding"]);
  const preview = findSetupElement(
    ui.form,
    (node) => typeof node.props?.onOpen === "function",
  );
  assert.equal(preview.props.onOpen(), true);
  assert.deepEqual(ui.saves, ["draft", "branding", "draft", "branding"]);
  assert.equal(
    loadPublication(publicationKey("owner", seed.eventId, "th")),
    null,
  );
  await ui.submit();
  assert.equal(ui.confirmations.length, 2);
  const receipt = loadPublication(publicationKey("owner", seed.eventId, "th"));
  assert.equal(receipt.branding.primary, ui.branding.primary);
  assert.equal(receipt.draft.hasRegistration, false);
  assert.equal(receipt.draft.hasSurvey, false);
  assert.equal(ui.workspace.eventStatus, "draft");
  assert.deepEqual(ui.navigation, ["/event/forms"]); // No out-of-scope Dashboard route.
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
  assert.equal(preview.props.onOpen(), false);
  await failed.submit();
  assert.deepEqual(failed.navigation, []);
  assert.deepEqual(failed.confirmations, []);
  assert.equal(loadPublication(key), null);
});

test("Publish Full Preview link only navigates after its local save succeeds", () => {
  const Preview = compileSetupComponent(
    "src/components/event/setup/PublishParticipantPreview.tsx",
    {
      "@/components/event/participant/ParticipantPreviewViewport": {
        default: () => null,
      },
      "@/i18n/navigation": { Link: () => null },
      "next-intl": { useTranslations: () => (key) => key },
      react: { useState: (initial) => [initial, () => {}] },
    },
  );
  for (const saved of [false, true]) {
    let saves = 0;
    let prevented = false;
    const screen = Preview({
      draft: seed,
      branding: defaultEventBranding,
      onOpen: () => {
        saves++;
        return saved;
      },
    });
    const link = findSetupElement(screen, (node) =>
      node.props?.href?.startsWith("/preview/event"),
    );
    assert.equal(link.props.href, "/preview/event?device=desktop&from=publish");
    link.props.onClick({
      preventDefault() {
        prevented = true;
      },
    });
    assert.equal(saves, 1);
    assert.equal(prevented, !saved);
  }
});
