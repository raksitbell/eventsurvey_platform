import { z } from "zod";
import {
  eventDraftFieldsSchema,
  legacyDraftContent,
  legacyEventSetupLocales,
} from "@/core/event/draft";
import { eventBrandingSchema } from "@/core/event/branding";
import { uniqueFieldIssue } from "@/core/forms/unique-field";
import { validatePublishReady } from "@/core/forms/content";
import type { FormRecord, FormType } from "@/types/event/form";

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
  draft: eventDraftFieldsSchema,
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

/** Freeze one enabled form. Activating a draft uses the Form Builder's own validator. */
export function formForPublication(type: FormType, records: readonly FormRecord[]): PublicationForm | null {
  const matches = records.filter((record) => record.type === type);
  if (matches.length !== 1 || !["draft", "scheduled", "open", "published"].includes(matches[0].status)) return null;
  const parsed = form.safeParse(matches[0]);
  if (!parsed.success) return null;
  if (parsed.data.status !== "draft") return parsed.data;
  if (uniqueFieldIssue(parsed.data.questions) || validatePublishReady(parsed.data)) return null;
  return { ...parsed.data, status: "scheduled" };
}
