/* eslint-disable @typescript-eslint/no-require-imports -- The standalone Node test runner uses the shared CommonJS loader. */
const assert = require("node:assert/strict");
const { mkdtemp, rm } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const test = require("node:test");
const { loadSource } = require("./support/load-source.cjs");

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

async function configureMediaDirectory(t) {
  const previous = process.env.EVENT_SETUP_MEDIA_DIR;
  const dir = await mkdtemp(join(tmpdir(), "eventsurvey-setup-media-"));
  process.env.EVENT_SETUP_MEDIA_DIR = dir;
  t.after(async () => {
    if (previous === undefined) delete process.env.EVENT_SETUP_MEDIA_DIR;
    else process.env.EVENT_SETUP_MEDIA_DIR = previous;
    await rm(dir, { recursive: true, force: true });
  });
  return dir;
}

test("media storage reports when browser fallback is needed and rejects invalid files", async (t) => {
  const { storeEventSetupMedia } = loadSource()("src/services/event/setup-media.ts");
  const dir = await configureMediaDirectory(t);
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
    storeEventSetupMedia("event-a", uploadRequest(new Uint8Array(2 * 1024 * 1024), "image/png")),
    { status: 413 },
  );
});

test("event media is served publicly only when referenced by its published event", async (t) => {
  await configureMediaDirectory(t);
  const event = { id: "event-a", status: "draft" };
  let publication = null;
  let publishedBranding;
  const load = loadSource({
    "@/core/api/mock-client": {
      mockApi: {
        get: async (path) => {
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
