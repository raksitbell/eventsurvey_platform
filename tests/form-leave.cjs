/* eslint-disable @typescript-eslint/no-require-imports -- The Node tests load TypeScript through the repository harness. */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const { loadSource } = require("./support/load-source.cjs");

test("an approved history Back resumes even when saving releases the survey's navigation guard", async (t) => {
  const guard = { current: null };
  const navigation = new EventTarget();
  const location = { href: "https://example.test/event/setup/survey" };
  const traversals = [];
  const windowEvents = new EventTarget();
  navigation.traverseTo = (key) => {
    const reload = new Event("beforeunload", { cancelable: true });
    windowEvents.dispatchEvent(reload);
    assert.equal(reload.defaultPrevented, false);
    traversals.push(key);
    return { committed: Promise.resolve(), finished: Promise.resolve() };
  };

  const globals = {
    navigation, location,
    addEventListener: windowEvents.addEventListener.bind(windowEvents),
    removeEventListener: windowEvents.removeEventListener.bind(windowEvents),
  };
  for (const [key, value] of Object.entries(globals)) {
    const old = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, value });
    t.after(() => {
      if (old) Object.defineProperty(globalThis, key, old);
      else delete globalThis[key];
    });
  }

  let cleanup;
  const load = loadSource({
    react: { useEffect: (effect) => { cleanup = effect(); }, useEffectEvent: (fn) => fn },
    "@/components/event/workspace/EventNavigationGuard": { useEventNavigationGuard: () => guard },
  });
  const register = load("src/hooks/useWhitelistNavigationGuard.ts").default;
  function back() {
    const event = Object.assign(new Event("navigate", { cancelable: true }), {
      navigationType: "traverse",
      destination: { key: "details", url: "https://example.test/event/details", sameDocument: true },
    });
    navigation.dispatchEvent(event);
    return event.defaultPrevented;
  }

  register(true, async () => false);
  assert.equal(back(), true);
  await new Promise(setImmediate);
  assert.deepEqual(traversals, []);
  cleanup();

  register(true, async () => { cleanup(); return true; });
  assert.equal(back(), true);
  await new Promise(setImmediate);
  assert.equal(guard.current, null);
  assert.deepEqual(traversals, ["details"]);

  // Discard keeps the editor dirty while the approved traversal is running.
  register(true, async () => true);
  assert.equal(back(), true);
  await new Promise(setImmediate);
  assert.deepEqual(traversals, ["details", "details"]);
  const reload = new Event("beforeunload", { cancelable: true });
  windowEvents.dispatchEvent(reload);
  assert.equal(reload.defaultPrevented, true);
  cleanup();

  // WebKit rejects replay of a canceled traversal, even when its URL is valid.
  let replacement;
  location.replace = (href) => {
    assert.equal(windowEvents.dispatchEvent(new Event("beforeunload", { cancelable: true })), true);
    replacement = href;
  };
  navigation.traverseTo = () => ({
    committed: Promise.reject(new Error("Navigation aborted")),
    finished: Promise.reject(new Error("Navigation aborted")),
  });
  register(true, async () => true);
  assert.equal(back(), true);
  await new Promise(setImmediate);
  assert.equal(replacement, "https://example.test/event/details");
  cleanup();
});

test("the unsaved form dialog distinguishes Save, Discard and dismissal without changing binary confirms", async () => {
  let answer;
  let dialog;
  const load = loadSource({
    sweetalert2: { fire: async (options) => { dialog = options; return answer; } },
  });
  const { showSaveChanges, showConfirm } = load("src/utils/confirm.ts");
  const options = { title: "Form", message: "Unsaved draft", discardLabel: "Discard" };
  answer = { isConfirmed: true, isDenied: false };
  assert.equal(await showSaveChanges(options), "save");
  assert.equal(dialog.showDenyButton, true);
  assert.equal(dialog.denyButtonText, "Discard");
  answer = { isConfirmed: false, isDenied: true };
  assert.equal(await showSaveChanges(options), "discard");
  answer = { isConfirmed: false, isDenied: false };
  assert.equal(await showSaveChanges(options), "cancel");
  assert.equal(await showConfirm(options), false);
  assert.equal(dialog.showDenyButton, false);
});
