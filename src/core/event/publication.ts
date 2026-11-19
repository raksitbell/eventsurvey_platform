import { z } from "zod";
import {
  eventDraftSchema,
  legacyDraftContent,
  legacyEventSetupLocales,
} from "@/core/event/draft";
import { eventBrandingSchema } from "@/core/event/branding";
import { surveyClosingTime } from "@/core/event/schedule";
import { whitelistUniqueField } from "@/core/event/whitelist";
import { uniqueFieldIssue } from "@/core/forms/unique-field";
import { validatePublishReady } from "@/core/forms/content";
import type { EventDraft } from "@/types/event/setup";
import type { FormRecord, FormType, PublishFormReadiness, QuestionType, RestrictedFormReview } from "@/types/event/form";

/** Minimal form shape accepted by publicationIssues; validated by Zod inside. */
interface MinimalChoice {
  label: string;
}
interface MinimalLabel {
  label: string;
  choices: Record<string, MinimalChoice[]>;
}
interface MinimalQuestion {
  id?: string;
  is_unique?: boolean;
  type: QuestionType;
  label: Record<string, MinimalLabel[]>;
  min_length: number;
  max_length: number;
  min_number: number;
  max_number: number;
}
interface MinimalForm {
  type: FormType;
  questions: Array<{ question: MinimalQuestion }>;
  head: Record<string, { title: string; description: string }>;
  opensAt?: string | null;
  closesAt?: string | null;
}
type MinimalForms = Record<FormType, MinimalForm | null>;

const choice = z.object({
  id: z.string().optional(),
  label: z.string(),
  display_order: z.number().int().positive(),
});
const label = z.object({
  label: z.string(),
  placeholder: z.string(),
  scale_min_label: z.string().optional(),
  scale_max_label: z.string().optional(),
  choices: z.object({ th: z.array(choice).default([]), en: z.array(choice).default([]) }),
});
const heading = z.object({ title: z.string(), description: z.string() })
  .default({ title: "", description: "" });
const form = z.object({
  id: z.string(),
  eventId: z.string(),
  type: z.enum(["registration", "survey"]),
  status: z.enum([
    "draft",
    "scheduled",
    "open",
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
  acceptingResponses: z.boolean().optional(),
  publishedAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  head: z.object({
    th: heading,
    en: heading,
  }),
  questions: z.array(
    z.object({
      question: z
        .object({
          id: z.string().optional(),
          type: z.enum([
            "email",
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
          required: z.boolean().optional(),
          is_required: z.boolean().optional(),
          is_unique: z.boolean().optional(),
          min_value: z.number().nullable().optional(),
          max_value: z.number().nullable().optional(),
          rating_max: z.number().optional(),
          rating_display: z.enum(["icon", "linear_scale"]).optional(),
          rating_icon: z.enum(["star", "heart", "like"]).optional(),
          label: z.object({
            th: z.array(label).default([]),
            en: z.array(label).default([]),
          }).refine((labels) => labels.th.length > 0 || labels.en.length > 0),
        })
        .refine(
          (q) =>
            typeof q.required === "boolean" ||
            typeof q.is_required === "boolean",
        ),
    }),
  ),
});
export type PublicationForm = z.infer<typeof form>;
export type PublicationForms = {
  registration: PublicationForm | null;
  survey: PublicationForm | null;
};
export const publicationSchema = z.object({
  // Zod v4: z.string().datetime() is deprecated; use z.iso.datetime() instead.
  publishedAt: z.iso.datetime(),
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
export function publicationV2Key(userId: string, eventId: string) {
  return `eventsurvey:event-publication:v2:${encodeURIComponent(userId)}:${encodeURIComponent(eventId)}`;
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

export function loadEventPublication(
  userId: string,
  eventId: string,
  locale: string,
  multilingual = true,
): LocalPublication | null {
  const shared = loadPublication(publicationV2Key(userId, eventId));
  if (shared?.draft.content) return shared;
  if (!multilingual)
    return loadPublication(publicationKey(userId, eventId, locale));

  // Both old locale keys could contain receipts. Keep the first publication
  // authoritative across portal locales and never merge draft text into it.
  const legacy = legacyEventSetupLocales
    .flatMap((language) => {
      const receipt = loadPublication(
        publicationKey(userId, eventId, language),
      );
      return receipt ? [{ language, receipt }] : [];
    })
    .sort(
      (a, b) =>
        Date.parse(a.receipt.publishedAt) - Date.parse(b.receipt.publishedAt),
    )[0];
  if (!legacy) return null;
  const { receipt, language } = legacy;
  return {
    ...receipt,
    draft: {
      ...receipt.draft,
      content: legacyDraftContent(receipt.draft, language),
    },
  };
}

type SharedPublishIssue =
  | "eventName"
  | "location"
  | "eventSchedule"
  | "formContent"
  | "formStatus"
  | "surveySchedule"
  | "uniqueField"
  | "registeredEligibility"
  | "whitelist"
  | "capacity";
export type PublishIssue =
  | SharedPublishIssue
  | { key: "contentTitle" | "contentVenue"; localeCode: string };
type FormProblem = "formContent" | "formStatus";
type FormProblems = Record<FormType, FormProblem[]>;

function hasPublishableStatus(type: FormType, list: readonly { type: string; status: string }[]) {
  const matches = list.filter((item) => item.type === type);
  return matches.length === 1 && ["draft", "scheduled", "open", "published"].includes(matches[0].status);
}

export function publishFormReadiness(type: FormType, list: readonly FormRecord[]): PublishFormReadiness {
  const definition = list.find((item) => item.type === type) ?? null;
  return {
    present: definition !== null,
    contentReady: !!definition && hasCompleteContent(type, definition),
    statusReady: hasPublishableStatus(type, list),
    hasUniqueField: !!whitelistUniqueField(definition),
  };
}

/** The current form list adds lifecycle checks. Participant eligibility applies to every draft review. */
export function reviewPublication(
  draft: EventDraft,
  forms: MinimalForms,
  formList?: readonly { type: string; status: string }[],
  restrictedForms?: RestrictedFormReview,
  whitelistReady = false,
) {
  const issues = new Set<SharedPublishIssue>();
  const languageIssues: PublishIssue[] = [];
  const formProblems: FormProblems = { registration: [], survey: [] };
  if (draft.content) {
    for (const row of draft.content.translations) {
      if (!row.title.trim())
        languageIssues.push({
          key: "contentTitle",
          localeCode: row.localeCode,
        });
      if (!row.locationName?.trim())
        languageIssues.push({
          key: "contentVenue",
          localeCode: row.localeCode,
        });
    }
  } else {
    if (!draft.locationName?.trim()) issues.add("location");
    if (!draft.eventName.trim()) issues.add("eventName");
  }
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
    const hidden = restrictedForms?.[type];
    const invalidStatus = hidden
      ? !hidden.statusReady
      : formList && !hasPublishableStatus(type, formList);
    if (invalidStatus) {
      formProblems[type].push("formStatus");
      issues.add("formStatus");
    }
    const contentReady = hidden?.contentReady ??
      (!!definition && hasCompleteContent(type, definition));
    if (!contentReady) {
      formProblems[type].push("formContent");
      issues.add("formContent");
    }
    if (type !== "survey") continue;
    const opensAt = definition ? definition.opensAt : draft.startsAt;
    const closesAt = definition ? definition.closesAt : surveyClosingTime(draft);
    if (
      !opensAt || !closesAt ||
      !Number.isFinite(Date.parse(opensAt)) ||
      !Number.isFinite(Date.parse(closesAt)) ||
      Date.parse(closesAt) <= Date.parse(opensAt) ||
      (draft.endsAt && Date.parse(closesAt) < Date.parse(draft.endsAt))
    )
      issues.add("surveySchedule");
  }
  const registeredSurvey = draft.hasSurvey && draft.surveyAccess === "registered_only";
  const validIdentifier = draft.hasRegistration &&
    (restrictedForms?.registration?.hasUniqueField ?? !!whitelistUniqueField(forms.registration));
  if ((draft.isPrivate || registeredSurvey) && !validIdentifier) {
    issues.add("uniqueField");
  }
  if (draft.isPrivate && !whitelistReady) issues.add("whitelist");
  if (registeredSurvey) issues.add("registeredEligibility");
  for (const capacity of [
    draft.hasRegistration ? draft.registrationCapacity : null,
    draft.hasSurvey && draft.surveyAccess === "public"
      ? draft.surveyCapacity
      : null,
  ])
    if (capacity != null && (!Number.isInteger(capacity) || capacity <= 0))
      issues.add("capacity");
  return { issues: [...languageIssues, ...issues], formProblems };
}

export function publicationIssues(
  draft: EventDraft,
  forms: MinimalForms,
): PublishIssue[] {
  return reviewPublication(draft, forms).issues;
}

function hasCompleteContent(type: FormType, definition: MinimalForm): boolean {
  const parsed = form.safeParse(definition);
  return parsed.success && parsed.data.type === type &&
    !uniqueFieldIssue(parsed.data.questions) && !validatePublishReady(parsed.data);
}
