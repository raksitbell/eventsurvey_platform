/* eslint-disable @typescript-eslint/no-require-imports -- Node's standalone test runner loads compiled TypeScript. */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const { loadSource } = require("./support/load-source.cjs");

test("header locale navigation restores a missing fragment after the new locale commits", (t) => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  t.after(() => {
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
    else delete globalThis.window;
  });

  const location = {
    pathname: "/admin/events/test-event",
    search: "?tab=users&filter=a%2Fb&filter=two",
    hash: "#event%20users",
  };
  const effects = [];
  const historyWrites = [];
  const navigations = [];
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      location,
      history: { replaceState: (...args) => historyWrites.push(args) },
    },
  });
  const load = loadSource({
    react: { useEffect: (effect) => effects.push(effect) },
    "@/i18n/navigation": {
      usePathname: () => location.pathname,
      useRouter: () => ({ replace: (...args) => navigations.push(args) }),
    },
  });
  const useHeaderLocale = load("src/hooks/useHeaderLocale.ts").default;
  function commitHeader(locale) {
    const changeLocale = useHeaderLocale(locale);
    effects.shift()();
    return changeLocale;
  }

  const href = location.pathname + location.search + location.hash;
  commitHeader("th")("en");
  assert.deepEqual(navigations, [[href, { locale: "en" }]]);
  location.hash = "";
  commitHeader("th");
  assert.deepEqual(historyWrites, []);
  const changeLocale = commitHeader("en");
  commitHeader("en");
  assert.deepEqual(historyWrites, [[null, "", href]]);

  location.hash = "#next-anchor";
  changeLocale("en");
  assert.equal(navigations.length, 1);
  changeLocale("th");
  location.search = "?tab=details";
  location.hash = "";
  commitHeader("th");
  assert.equal(historyWrites.length, 1);
});
