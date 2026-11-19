const EVENT_SETUP_SAVED = "eventsurvey:event-setup-saved";
const API_STATE_PREFIX = "eventsurvey:event-setup-api:";

function setupUpdatesChannel() {
  try {
    return typeof BroadcastChannel === "function"
      ? new BroadcastChannel(EVENT_SETUP_SAVED)
      : null;
  } catch {
    return null;
  }
}

export function eventSetupStateKey(eventId: string): string {
  return API_STATE_PREFIX + encodeURIComponent(eventId);
}

/** Notify the current tab, and other open tabs for API writes. */
export function notifyEventSetupSaved(key: string): void {
  if (typeof globalThis.window === "undefined") return;
  globalThis.window.dispatchEvent(
    new CustomEvent<string>(EVENT_SETUP_SAVED, { detail: key }),
  );
  if (!key.startsWith(API_STATE_PREFIX)) return;
  const channel = setupUpdatesChannel();
  try {
    channel?.postMessage(key);
  } catch {
    // Same-tab notifications and refresh on focus still operate.
  } finally {
    channel?.close();
  }
}

export function subscribeToEventSetup(
  keys: readonly string[],
  onChange: () => void,
): () => void {
  if (typeof globalThis.window === "undefined") return () => {};
  const target = globalThis.window;
  const onSaved = (event: Event) => {
    if (keys.includes((event as CustomEvent<string>).detail)) onChange();
  };
  const onStorage = (event: StorageEvent) => {
    if (event.storageArea && event.storageArea !== globalThis.localStorage)
      return;
    if (event.key === null || keys.includes(event.key)) onChange();
  };
  const channel = keys.some((key) => key.startsWith(API_STATE_PREFIX))
    ? setupUpdatesChannel()
    : null;
  const onMessage = (event: MessageEvent<unknown>) => {
    if (typeof event.data === "string" && keys.includes(event.data)) onChange();
  };
  target.addEventListener(EVENT_SETUP_SAVED, onSaved);
  target.addEventListener("storage", onStorage);
  channel?.addEventListener("message", onMessage);
  return () => {
    target.removeEventListener(EVENT_SETUP_SAVED, onSaved);
    target.removeEventListener("storage", onStorage);
    channel?.close();
  };
}
