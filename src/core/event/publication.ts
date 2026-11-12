import { z } from "zod";
import { eventDraftSchema } from "@/core/event/draft";
import { eventBrandingSchema } from "@/core/event/branding";
import { notifyEventSetupSaved } from "@/core/event/local-events";
import type { EventDraft } from "@/types/event/setup";
import type { FormRecord, FormType } from "@/types/event/form";

export type SetupForms = Record<FormType, FormRecord | null>;
const choice = z.object({
  id: z.string().optional(),
  label: z.string(),
  display_order: z.number().int().positive(),
});
const label = z.object({
  label: z.string(),
  placeholder: z.string(),
  choices: z.object({ th: z.array(choice), en: z.array(choice) }),
});
const form = z.object({
  id: z.string(),
  eventId: z.string(),
  type: z.enum(["registration", "survey"]),
  status: z.enum([
    "draft",
    "pending_approval",
    "approved",
    "rejected",
    "published",
    "paused",
    "closed",
    "archived",
  ]),
  opensAt: z.string().nullable(),
  closesAt: z.string().nullable(),
  acceptingResponses: z.boolean(),
  publishedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  head: z.object({
    th: z.object({ title: z.string(), description: z.string() }),
    en: z.object({ title: z.string(), description: z.string() }),
  }),
  questions: z.array(
    z.object({
      question: z.object({
        id: z.string().optional(),
        type: z.enum([
          "short_text",
          "long_text",
          "multiple_choice",
          "dropdown",
          "checkbox",
          "date",
          "time",
          "number",
          "rating",
        ]),
        display_order: z.number().int().positive(),
        min_number: z.number(),
        max_number: z.number(),
        min_length: z.number().int().nonnegative(),
        max_length: z.number().int().nonnegative(),
        required: z.boolean(),
        label: z.object({
          th: z.array(label).min(1),
          en: z.array(label).min(1),
        }),
      }),
    }),
  ),
});
export const publicationSchema = z.object({
  publishedAt: z.string().datetime(),
  draft: eventDraftSchema,
  branding: eventBrandingSchema,
  forms: z.object({ registration: form.nullable(), survey: form.nullable() }),
});
export type LocalPublication = z.infer<typeof publicationSchema>;
export function publicationKey(
  userId: string,
  eventId: string,
  locale: string,
) {
  return `eventsurvey:event-publication:v1:${userId}:${eventId}:${locale}`;
}
export function loadPublication(key: string): LocalPublication | null {
  try {
    const raw = globalThis.localStorage.getItem(key);
    if (!raw) return null;
    const result = publicationSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
export function savePublication(key: string, value: unknown): boolean {
  const parsed = publicationSchema.safeParse(value);
  if (
    !parsed.success ||
    publicationIssues(parsed.data.draft, parsed.data.forms).length ||
    loadPublication(key)
  )
    return false;
  try {
    globalThis.localStorage.setItem(key, JSON.stringify(parsed.data));
    notifyEventSetupSaved(key);
    return true;
  } catch {
    return false;
  }
}
export type PublishIssue =
  | "eventName"
  | "eventSchedule"
  | "formContent"
  | "surveySchedule"
  | "uniqueField"
  | "whitelist"
  | "capacity";
/** Validate read-only BFF form definitions; form editing belongs to the Form team's branch. */
export function publicationIssues(
  draft: EventDraft,
  forms: SetupForms,
): PublishIssue[] {
  const issues = new Set<PublishIssue>();
  if (!draft.eventName.trim()) issues.add("eventName");
  if (
    !draft.startsAt ||
    !draft.endsAt ||
    !Number.isFinite(Date.parse(draft.startsAt)) ||
    !Number.isFinite(Date.parse(draft.endsAt)) ||
    Date.parse(draft.endsAt) <= Date.parse(draft.startsAt)
  )
    issues.add("eventSchedule");
  for (const type of ["registration", "survey"] as const) {
    if (!(type === "registration" ? draft.hasRegistration : draft.hasSurvey))
      continue;
    const definition = forms[type];
    if (
      !definition ||
      definition.type !== type ||
      !form.safeParse(definition).success ||
      !definition.questions.length
    ) {
      issues.add("formContent");
      continue;
    }
    for (const locale of ["th", "en"] as const) {
      if (!definition.head[locale].title.trim()) issues.add("formContent");
      for (const { question: q } of definition.questions) {
        const item = q.label[locale][0];
        if (!item?.label.trim()) issues.add("formContent");
        if (
          ["multiple_choice", "checkbox", "dropdown"].includes(q.type) &&
          (!item?.choices[locale].length ||
            item.choices[locale].some((c) => !c.label.trim()))
        )
          issues.add("formContent");
        if (
          (q.min_length > q.max_length && q.max_length > 0) ||
          q.min_number > q.max_number
        )
          issues.add("formContent");
      }
    }
    if (
      type === "survey" &&
      (!definition.opensAt ||
        !definition.closesAt ||
        !Number.isFinite(Date.parse(definition.opensAt)) ||
        !Number.isFinite(Date.parse(definition.closesAt)) ||
        Date.parse(definition.closesAt) <= Date.parse(definition.opensAt))
    )
      issues.add("surveySchedule");
  }
  // This branch's BFF does not expose Unique Field or validated Whitelist metadata.
  // Keep these paths blocked until the owning feature's contract is integrated.
  if (draft.hasSurvey && draft.surveyAccess === "registered_only")
    issues.add("uniqueField");
  if (draft.isPrivate && draft.hasRegistration) issues.add("whitelist");
  for (const capacity of [
    draft.hasRegistration ? draft.registrationCapacity : null,
    draft.hasSurvey && draft.surveyAccess === "public"
      ? draft.surveyCapacity
      : null,
  ])
    if (capacity != null && (!Number.isInteger(capacity) || capacity <= 0))
      issues.add("capacity");
  return [...issues];
}
