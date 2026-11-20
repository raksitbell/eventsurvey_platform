/* eslint-disable @typescript-eslint/no-require-imports -- The standalone Node test runner uses the shared CommonJS loader. */
const assert = require("node:assert/strict");
const { mkdtemp, rm } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const test = require("node:test");
const { loadSource } = require("./support/load-source.cjs");
const { IMAGE_MAX_INPUT_BYTES, IMAGE_MAX_LOCAL_BYTES } =
  loadSource()("src/utils/image-upload.ts");

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==",
  "base64",
);

function uploadRequest(bytes, type, eventId = "event-a") {
  const body = new FormData();
  body.set("file", new Blob([bytes], { type }), "logo");
  body.set("eventId", eventId);
  return new Request("http://localhost/api/event/setup/media", {
    method: "POST",
    body,
  });
}

function oversizedUploadRequest(onCancel) {
  const boundary = "eventsurvey-test-boundary";
  // Feed the handler multipart bytes as an incoming streaming request.
  const chunks = [
    Buffer.from([
      `--${boundary}`,
      'Content-Disposition: form-data; name="eventId"',
      "",
      "event-a",
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="logo.png"',
      "Content-Type: image/png",
      "",
      "",
    ].join("\r\n")),
    Buffer.alloc(IMAGE_MAX_INPUT_BYTES),
    Buffer.alloc(128 * 1024),
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ];
  const body = new ReadableStream({
    pull(controller) {
      const chunk = chunks.shift();
      if (chunk) controller.enqueue(chunk);
      else controller.close();
    },
    cancel: onCancel,
  }, { highWaterMark: 0 });
  return new Request("http://localhost/api/event/setup/media", {
    method: "POST",
    headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
    body,
    duplex: "half",
  });
}

async function configureMediaDirectory(t, mode) {
  const oldMode = process.env.NODE_ENV;
  if (mode) process.env.NODE_ENV = mode;
  const previous = process.env.EVENT_SETUP_MEDIA_DIR;
  const dir = await mkdtemp(join(tmpdir(), "eventsurvey-setup-media-"));
  process.env.EVENT_SETUP_MEDIA_DIR = dir;
  t.after(async () => {
    if (oldMode === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = oldMode;
    if (previous === undefined) delete process.env.EVENT_SETUP_MEDIA_DIR;
    else process.env.EVENT_SETUP_MEDIA_DIR = previous;
    await rm(dir, { recursive: true, force: true });
  });
  return dir;
}

test("prepare offers disk only when disk uploads are configured for the deployment", async (t) => {
  const originalEnv = process.env;
  process.env = { ...originalEnv, NODE_ENV: "production", VERCEL: "1", EVENT_SETUP_MEDIA_DIR: tmpdir() };
  t.after(() => { process.env = originalEnv; });
  delete process.env.BLOB_STORE_ID;
  delete process.env.EVENT_SETUP_MEDIA_PROVIDER;

  const { POST } = loadSource({
    "@/core/auth/api-guard": {
      requireEventSession: async () => ({ userId: "owner" }),
      isAuthSession: () => true,
      denyUnlessEventPermission: async () => null,
    },
    "@/core/api/mock-client": {
      mockApi: {
        get: async () => ({ id: "owner", status: "active", event_id: "event-a" }),
        getFresh: async () => ({ id: "event-a", status: "draft" }),
      },
    },
  })("src/app/api/event/setup/media/route.ts");
  const prepare = () => POST(new Request("http://localhost/api/event/setup/media", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "prepare",
      eventId: "event-a",
      kind: "banner",
      contentType: "image/bmp",
      size: 8 * 1024 * 1024,
    }),
  }));
  async function expectUnavailable() {
    const response = await prepare();
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: "SETUP_MEDIA_STORAGE_UNAVAILABLE" });
  }

  // Even an absolute disk path does not enable disk uploads implicitly on Vercel.
  await expectUnavailable();
  process.env.EVENT_SETUP_MEDIA_PROVIDER = "disk";
  const configured = await prepare();
  assert.equal(configured.status, 200);
  assert.deepEqual(await configured.json(), { mode: "disk" });

  delete process.env.VERCEL;
  delete process.env.EVENT_SETUP_MEDIA_DIR;
  await expectUnavailable();
});

test("media storage reports when browser fallback is needed and rejects invalid files", async (t) => {
  const { storeEventSetupMedia } = loadSource()("src/services/event/setup-media.ts");
  const dir = await configureMediaDirectory(t, "production");
  delete process.env.EVENT_SETUP_MEDIA_DIR;
  await assert.rejects(
    storeEventSetupMedia("event-a", uploadRequest(png, "image/png")),
    { status: 503 },
  );
  process.env.EVENT_SETUP_MEDIA_DIR = dir;
  await assert.rejects(
    storeEventSetupMedia("event-b", uploadRequest(png, "image/png")),
    { status: 409 },
  );
  await assert.rejects(
    storeEventSetupMedia("event-a", uploadRequest(png, "image/jpeg")),
    { status: 415 },
  );
  await assert.rejects(
    storeEventSetupMedia("event-a", uploadRequest(png, "image/svg+xml")),
    { status: 415 },
  );
  await assert.rejects(
    storeEventSetupMedia("event-a", uploadRequest(Buffer.alloc(IMAGE_MAX_INPUT_BYTES), "image/png")),
    { code: "SETUP_MEDIA_TOO_LARGE", status: 413 },
  );
  let cancelled = false;
  const oversized = oversizedUploadRequest(() => { cancelled = true; });
  assert.equal(oversized.headers.has("Content-Length"), false);
  await assert.rejects(
    storeEventSetupMedia("event-a", oversized),
    { code: "SETUP_MEDIA_TOO_LARGE", status: 413 },
  );
  assert.equal(cancelled, true);
});

for (const useDefault of [false, true]) {
  const storage = useDefault ? "default development media directory" : "configured media directory";
  test(`${storage} saves and reopens original images above one MiB`, async (t) => {
    const dir = await configureMediaDirectory(t, useDefault ? "development" : "production");
    if (useDefault) {
      delete process.env.EVENT_SETUP_MEDIA_DIR;
      t.mock.method(process, "cwd", () => dir);
    }
    const { storeEventSetupMedia, findEventSetupMedia, readEventSetupMedia } =
      loadSource()("src/services/event/setup-media.ts");
    // A 24-bit BMP with 1024 × 768 pixels and uncompressed rows.
    const bmp = Buffer.alloc(54 + 1024 * 768 * 3);
    bmp.write("BM");
    bmp.writeUInt32LE(bmp.length, 2);
    bmp.writeUInt32LE(54, 10);
    bmp.writeUInt32LE(40, 14);
    bmp.writeInt32LE(1024, 18);
    bmp.writeInt32LE(768, 22);
    bmp.writeUInt16LE(1, 26);
    bmp.writeUInt16LE(24, 28);
    assert.ok(bmp.length > IMAGE_MAX_LOCAL_BYTES);
    const { url } = await storeEventSetupMedia("event-a", uploadRequest(bmp, "image/bmp"));
    const asset = await findEventSetupMedia(url.split("/").pop());
    assert.equal(asset.size, bmp.length);
    assert.deepEqual(Buffer.from(await readEventSetupMedia(asset)), bmp);
  });
}

test("event media is served publicly only when referenced by its published event", async (t) => {
  await configureMediaDirectory(t);
  const event = { id: "event-a", status: "draft" };
  let publication = null;
  let publishedBranding;
  const load = loadSource({
    "@/core/api/mock-client": {
      mockApi: {
        getFresh: async (path) => {
          assert.equal(path, "/events/event-a");
          return event;
        },
      },
    },
    "@/core/auth/api-guard": {
      requireEventSession: async (request) => ({
        userId: request.headers.get("X-Test-User"),
      }),
      isAuthSession: (session) => Boolean(session.userId),
      denyUnlessEventPermission: async (userId, permission, eventId) =>
        userId === "event-a-owner" && permission === "manage_event" && eventId === event.id
          ? null
          : new Response(null, { status: 403 }),
    },
    "@/core/event/setup-storage": {
      readSetupRecord: () => ({ publication, publishedBranding }),
    },
  });
  const { storeEventSetupMedia, assertEventSetupMedia } = load(
    "src/services/event/setup-media.ts",
  );
  const { GET } = load("src/app/api/event/setup/media/[id]/route.ts");
  const { url } = await storeEventSetupMedia(event.id, uploadRequest(png, "image/png"));
  const id = url.split("/").pop();
  const download = (userId) => GET(
    new Request("http://localhost" + url, {
      headers: userId ? { "X-Test-User": userId } : {},
    }),
    { params: Promise.resolve({ id }) },
  );

  await assertEventSetupMedia(event.id, [url]);
  await assert.rejects(assertEventSetupMedia("event-b", [url]), { status: 409 });
  await assert.rejects(assertEventSetupMedia(event.id, [url + "/.."]), { status: 400 });
  assert.equal((await download()).status, 404);
  assert.equal((await download("event-b-owner")).status, 404);
  assert.equal((await download("event-a-owner")).status, 200);

  publication = { branding: {} };
  publishedBranding = { en: { banner: { url } } };
  assert.equal((await download()).status, 404);
  event.status = "scheduled";
  const response = await download();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Content-Type"), "image/png");
  assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), png);

  event.status = "archived";
  assert.equal((await download()).status, 404);
  event.status = "closed";
  event.deleted_at = "2026-11-19T09:00:00.000Z";
  assert.equal((await download()).status, 404);
});
