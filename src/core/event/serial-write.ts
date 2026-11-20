const eventWriteState = globalThis as typeof globalThis & {
  eventSurveySetupLocks?: Map<string, Promise<void>>;
};
const locks = eventWriteState.eventSurveySetupLocks ??= new Map();

/** JSON Server replaces event and form data in several writes per edit. */
export async function writeSerially<T>(eventId: string, operation: () => Promise<T>): Promise<T> {
  const next = Promise.resolve(locks.get(eventId)).then(operation);
  const settled = next.then(() => {}, () => {});
  locks.set(eventId, settled);
  try {
    return await next;
  } finally {
    if (locks.get(eventId) === settled) locks.delete(eventId);
  }
}
