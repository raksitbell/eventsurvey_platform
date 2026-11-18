const EVENT_SETUP_SAVED = "eventsurvey:event-setup-saved";

/** Native storage events only reach other tabs; notify this tab after a successful save. */
export function notifyEventSetupSaved(key: string): void {
  if (typeof globalThis.window === "undefined") return;
  globalThis.window.dispatchEvent(
    new CustomEvent<string>(EVENT_SETUP_SAVED, { detail: key }),
  );
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
  target.addEventListener(EVENT_SETUP_SAVED, onSaved);
  target.addEventListener("storage", onStorage);
  return () => {
    target.removeEventListener(EVENT_SETUP_SAVED, onSaved);
    target.removeEventListener("storage", onStorage);
  };
}
