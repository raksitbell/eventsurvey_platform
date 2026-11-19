import { readSetupRecord } from "@/core/event/setup-storage";
import type { MockEvent, MockForm, MockFormType } from "@/types/mock";

export function getPublishedForm(event: MockEvent, kind: MockFormType) {
  const saved = readSetupRecord(event).publication?.forms[kind];
  return saved?.eventId === event.id && saved.type === kind ? saved : null;
}

export function withPublishedFormSchedule(
  form: MockForm,
  event: MockEvent | undefined,
): MockForm {
  if (!event || form.event_id !== event.id) return form;
  const saved = getPublishedForm(event, form.type);
  if (saved?.id !== form.id) return form;

  return { ...form, opens_at: saved.opensAt, closes_at: saved.closesAt };
}
