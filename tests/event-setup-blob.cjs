/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node route tests use the shared CommonJS loader. */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const { NextRequest } = require("next/server");
const { loadSource } = require("./support/load-source.cjs");
const { origin, password, setupMockData } = require("./support/mock-data.cjs");

process.env.MOCK_API_BASE_URL = origin;
process.env.MOCK_API_GET_CACHE_TTL_MS = "0";
process.env.AUTH_SESSION_SECRET = "session-secret-for-isolated-media-tests";
process.env.EVENT_SETUP_MEDIA_PROVIDER = "blob";

const mediaApi = "/api/event/setup/media";
const maxBytes = 10 * 1024 * 1024;
const contentType = "image/bmp";

function request(path, cookie, method = "GET", body) {
  const headers = new Headers();
  if (cookie) headers.set("cookie", cookie);
  if (body) headers.set("content-type", "application/json");
  return new NextRequest("https://portal.example.test" + path, {
    method, headers, body: body && JSON.stringify(body),
  });
}

// Only Blob's network boundary is substituted. Route guards, revisions, manifests,
// public snapshot selection, and the BFF use the same modules as the application.
function fixture(t) {
  const { collections, owner, otherOwner } = setupMockData(t, { eventWrites: true });
  const event = collections.events[0];
  Object.assign(event, { status: "draft", is_private: false, has_registration: false, has_survey: false });
  collections.events[1].status = "draft";
  const objects = new Map();
  const authorizations = [];
  const signatures = [];
  class BlobNotFoundError extends Error {}
  const load = loadSource({
    "@vercel/blob": {
      BlobNotFoundError,
      issueSignedToken: async (constraints) => {
        authorizations.push(constraints);
        return constraints;
      },
      presignUrl: async (token, options) => {
        assert.deepEqual(token.operations, [options.operation]);
        assert.equal(token.pathname, options.pathname);
        assert.equal(options.access, "private");
        signatures.push(options);
        return { presignedUrl: "https://private.example.test/" + options.pathname + "?action=" + options.operation };
      },
      get: async (key, options) => {
        assert.equal(options.access, "private");
        const file = objects.get(key);
        return file ? {
          statusCode: 200, stream: new Blob([file.bytes]).stream(),
          blob: { pathname: key, size: file.bytes.length, contentType: file.type },
        } : null;
      },
      head: async (key) => {
        const file = objects.get(key);
        if (!file) throw new BlobNotFoundError();
        return { pathname: key, size: file.bytes.length, contentType: file.type };
      },
      setTtl: async (key, { ttlDays }) => {
        assert.ok(objects.has(key));
        objects.get(key).ttlDays = ttlDays;
      },
      put: async (key, body, options) => {
        assert.equal(options.access, "private");
        assert.equal(options.allowOverwrite, false);
        if (objects.has(key)) throw new Error("already exists");
        objects.set(key, { bytes: Buffer.from(body), type: options.contentType });
      },
    },
  });
  const { POST: login } = load("src/app/api/auth/login/route.ts");
  const { POST } = load("src/app/api/event/setup/media/route.ts");
  const { GET } = load("src/app/api/event/setup/media/[id]/route.ts");
  const post = (cookie, action, fields) => POST(request(mediaApi, cookie, "POST", {
    eventId: event.id, kind: "banner", contentType, action, ...fields,
  }));
  const get = (id, cookie) => GET(request(mediaApi + "/" + id, cookie), { params: Promise.resolve({ id }) });
  async function signIn(user) {
    const response = await login(request("/api/auth/login", null, "POST", { email: user.email, password }));
    assert.equal(response.status, 200);
    return response.headers.get("set-cookie").split(";")[0];
  }
  return { load, owner, otherOwner, event, objects, authorizations, signatures, post, get, signIn };
}

test("Blob upload authorization binds size, type, event and kind before finalization", async (t) => {
  const { owner, otherOwner, objects, authorizations, signatures, post, get, signIn } = fixture(t);
  const cookie = await signIn(owner);
  const other = await signIn(otherOwner);
  const prepare = (changes) => post(cookie, "prepare", { size: 128, ...changes });
  assert.equal((await post(null, "prepare", { size: 128 })).status, 401);
  assert.equal((await prepare({ size: maxBytes })).status, 413);
  assert.equal((await prepare({ size: 0 })).status, 400);
  assert.equal((await prepare({ contentType: "image/svg+xml" })).status, 415);
  assert.equal((await prepare({ eventId: otherOwner.event_id })).status, 409);
  assert.equal(authorizations.length, 0);

  const response = await prepare({ size: maxBytes - 1 });
  assert.equal(response.status, 200);
  const { id } = await response.json();
  const signed = signatures[0];
  assert.equal(signed.maximumSizeInBytes, maxBytes - 1);
  assert.deepEqual(signed.allowedContentTypes, [contentType]);
  assert.equal(signed.allowOverwrite, false);
  assert.equal(signed.addRandomSuffix, false);
  assert.ok(authorizations[0].validUntil > Date.now());
  assert.ok(authorizations[0].validUntil <= Date.now() + 15 * 60_000);
  const invalid = { bytes: Buffer.from("This file is not a bitmap."), type: contentType };
  objects.set(signed.pathname, invalid);
  assert.equal((await post(cookie, "complete", { id })).status, 400);
  assert.equal((await get(id, cookie)).status, 404);

  invalid.bytes.write("BM");
  assert.equal((await post(other, "complete", { id, eventId: otherOwner.event_id })).status, 400);
  assert.equal((await post(cookie, "complete", { id, kind: "logo" })).status, 400);
  assert.equal((await get(id, cookie)).status, 404);
});

test("8 MiB Blob only becomes publicly readable after the saved event snapshot publishes", async (t) => {
  const { load, event, owner, otherOwner, objects, signatures, post, get, signIn } = fixture(t);
  const cookie = await signIn(owner);
  const other = await signIn(otherOwner);
  const bytes = Buffer.alloc(8 * 1024 * 1024);
  bytes.write("BM");
  // 2048 × 1023 uncompressed, 32 bits per pixel, starting at byte 8192.
  bytes.writeUInt32LE(bytes.length, 2);
  bytes.writeUInt32LE(8192, 10);
  bytes.writeUInt32LE(40, 14);
  bytes.writeInt32LE(2048, 18);
  bytes.writeInt32LE(1023, 22);
  bytes.writeUInt16LE(1, 26);
  bytes.writeUInt16LE(32, 28);
  const prepared = await post(cookie, "prepare", { size: bytes.length });
  assert.equal(prepared.status, 200);
  const { mode, id } = await prepared.json();
  assert.equal(mode, "blob");
  const { pathname } = signatures[0];
  objects.set(pathname, { bytes, type: contentType });
  assert.equal((await get(id, cookie)).status, 404);

  const completed = await post(cookie, "complete", { id });
  assert.equal(completed.status, 201);
  const { url } = await completed.json();
  assert.equal(url, mediaApi + "/" + id);
  const repeated = await post(cookie, "complete", { id });
  assert.equal(repeated.status, 201);
  assert.deepEqual(await repeated.json(), { url });
  assert.equal((await get(id)).status, 404);
  assert.equal((await get(id, other)).status, 404);

  async function checkRead(cookie) {
    const response = await get(id, cookie);
    assert.equal(response.status, 307);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    const target = signatures.at(-1);
    assert.equal(target.operation, "get");
    assert.equal(target.pathname, pathname);
    assert.ok(target.validUntil <= Date.now() + 60_000);
    assert.equal(new URL(response.headers.get("location")).pathname, "/" + pathname);
  }
  await checkRead(cookie);
  const draft = {
    eventName: "Public event", description: null, locationName: "Hall",
    startsAt: new Date(Date.now() + 86400_000).toISOString(),
    endsAt: new Date(Date.now() + 172800_000).toISOString(), isPrivate: false,
    hasRegistration: false, hasSurvey: false, surveyAccess: null,
  };
  const { defaultEventBranding } = load("src/core/event/branding.ts");
  const branding = { locale: "en", value: { ...defaultEventBranding, banner: { name: "event.bmp", url } } };
  const { PATCH: save } = load("src/app/api/event/setup/draft/route.ts");
  const saved = await save(request("/api/event/setup/draft", cookie, "PATCH", { eventId: event.id, revision: 0, draft, branding }));
  assert.equal(saved.status, 200);
  const { revision } = await saved.json();
  assert.equal((await get(id)).status, 404);

  const { POST: publish } = load("src/app/api/event/setup/publish/route.ts");
  const publishSaved = () => publish(request("/api/event/setup/publish", cookie, "POST", { eventId: event.id, revision, locale: "en" }));
  objects.delete(pathname);
  assert.equal((await publishSaved()).status, 409);
  assert.equal(event.status, "draft");
  objects.set(pathname, { bytes, type: contentType });
  const result = await publishSaved();
  assert.equal(result.status, 200);
  assert.equal((await result.json()).publication.branding.banner.url, url);
  await checkRead();
  assert.equal((await post(cookie, "complete", { id })).status, 409);
  event.status = "archived";
  assert.equal((await get(id)).status, 404);
});
