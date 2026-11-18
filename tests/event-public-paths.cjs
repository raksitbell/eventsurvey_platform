/* eslint-disable @typescript-eslint/no-require-imports -- Uses the standalone Node and TypeScript test harness. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const { NextRequest } = require("next/server");

function load(relative) {
  const filename = path.resolve(__dirname, "..", relative);
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  const resolve = (name) => {
    if (name === "next-intl/middleware") {
      return {
        default: () => (request) =>
          new Response(null, {
            headers: { "x-test-intl-path": request.nextUrl.pathname },
          }),
      };
    }
    if (name.startsWith("@/")) return load(`src/${name.slice(2)}.ts`);
    if (name.startsWith(".")) {
      return load(`${path.resolve(path.dirname(filename), name)}.ts`);
    }
    return require(name);
  };
  new Function("require", "exports", source)(resolve, exports);
  return exports;
}

const { isPublicEventPath, isPublicEventSlug, publicEventPath } = load(
  "src/core/event/public-event-paths.ts",
);
const { createAdminEventBodySchema, updateAdminEventBodySchema } = load(
  "src/core/validation/admin-events.ts",
);
const { default: proxy } = load("src/proxy.ts");

test("builds and recognizes each canonical Participant URL", () => {
  const event = "/event/open-house-2026";
  assert.equal(publicEventPath("open-house-2026"), event);
  assert.equal(
    publicEventPath("open-house-2026", "registration"),
    `${event}/register`,
  );
  assert.equal(publicEventPath("open-house-2026", "survey"), `${event}/survey`);
  for (const suffix of ["", "/register", "/survey", "/survey/"]) {
    assert.equal(isPublicEventPath(`${event}${suffix}`), true);
  }
  assert.equal(isPublicEventSlug("a".repeat(160)), true);
  assert.equal(isPublicEventSlug("a".repeat(161)), false);
});

test("recognizes only Participant routes with valid, non-reserved slugs", () => {
  for (const slug of [
    "",
    "Bad",
    "bad--slug",
    "with space",
    "x/y",
    "../x",
    "%71r",
    "qr\n",
  ]) {
    assert.equal(isPublicEventSlug(slug), false, slug);
    assert.throws(() => publicEventPath(slug), RangeError);
  }
  for (const pathname of [
    "/events/open-house",
    "/event/open-house/registration",
    "/event/open-house/survey/extra",
    "/event/open-house//survey",
    "/event//register",
    "/event/%71r",
  ]) {
    assert.equal(isPublicEventPath(pathname), false, pathname);
  }
});

test("reserves Portal routes in both creation and editing validation", () => {
  const titles = { titleTh: "", titleEn: "Open House" };
  const newEvent = {
    ...titles,
    mode: "existing",
    existingUserId: "f890f8dc-fabe-45a0-a118-4c5006e2b4b1",
  };
  for (const slug of [
    "branding",
    "details",
    "forms",
    "publish",
    "qr",
    "setup",
    "team",
    "whitelist",
  ]) {
    assert.equal(isPublicEventSlug(slug), false, slug);
    assert.equal(isPublicEventPath(`/event/${slug}/register`), false, slug);
    assert.equal(
      createAdminEventBodySchema.safeParse({ ...newEvent, slug }).success,
      false,
      slug,
    );
    assert.equal(
      updateAdminEventBodySchema.safeParse({ ...titles, slug }).success,
      false,
      slug,
    );
  }
  assert.equal(
    createAdminEventBodySchema.safeParse({ ...newEvent, slug: "open-house" })
      .success,
    true,
  );
  assert.equal(
    updateAdminEventBodySchema.parse({ ...titles, slug: " open-house " }).slug,
    "open-house",
  );
});

test("localizes anonymous Participant URLs and lets the rewrite finish", () => {
  for (const suffix of ["", "/register", "/survey"]) {
    const pathname = `/event/open-house${suffix}`;
    const result = proxy(new NextRequest(`https://example.test${pathname}`));
    assert.equal(result.headers.get("x-test-intl-path"), pathname);
    assert.equal(result.headers.get("location"), null);
  }

  for (const prefix of ["/en", "/th"]) {
    for (const suffix of ["", "/register", "/survey"]) {
      const pathname = `${prefix}/event/open-house${suffix}`;
      const result = proxy(new NextRequest(`https://example.test${pathname}`));
      assert.equal(result.headers.get("x-middleware-next"), "1");
      assert.equal(result.headers.get("x-test-intl-path"), null);
      assert.equal(result.headers.get("location"), null);
    }
  }
});

test("keeps Portal routes guarded with or without an internal locale segment", () => {
  for (const prefix of ["", "/en", "/th"]) {
    for (const pathname of [
      "/event",
      "/event/qr",
      "/event/team",
      "/event/setup/registration",
      "/event/qr/register",
    ]) {
      const result = proxy(
        new NextRequest(`https://example.test${prefix}${pathname}`),
      );
      assert.equal(
        result.headers.get("location"),
        "https://example.test/login",
        pathname,
      );
    }
  }
});
