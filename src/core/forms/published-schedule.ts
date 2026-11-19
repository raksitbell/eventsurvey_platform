import type { PublicationForm } from "@/core/event/publication";
import { readSetupRecord } from "@/core/event/setup-storage";
import type { Form } from "@/types/event/form";
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
  return matchPublishedForm(form, getPublishedForm(event, form.type)) ?? form;
}

/** Project the immutable schedule without overwriting a recorded transition. */
export function matchPublishedForm(
  form: MockForm,
  saved: PublicationForm | null,
): MockForm | null {
  if (
    !saved ||
    saved.id !== form.id ||
    saved.eventId !== form.event_id ||
    saved.type !== form.type
  ) {
    return null;
  }
  return {
    ...form,
    status:
      form.status === "draft" && saved.status === "scheduled"
        ? "scheduled"
        : form.status,
    opens_at: saved.opensAt,
    closes_at: saved.closesAt,
  };
}

export function publishedFormDefinition(saved: PublicationForm): Form {
  return {
    head: saved.head,
    type: saved.type,
    questions: saved.questions.map(({ question }) => ({
      question: {
        ...question,
        is_required: question.is_required ?? question.required ?? false,
        is_unique: question.is_unique ?? false,
        rating_display: question.rating_display ?? "icon",
        rating_icon: question.rating_icon ?? "star",
        rating_max: question.rating_max ?? 5,
      },
    })),
  };
}
