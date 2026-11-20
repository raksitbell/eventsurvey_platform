import { z } from "zod";
import { eventBrandingSchema } from "@/core/event/branding";
import { normalizeContentLocale } from "@/core/event/content";
import { eventDraftSchema } from "@/core/event/draft";
import { publicationSchema } from "@/core/event/publication";

export const setupRevisionSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER - 1);
export const setupLocaleSchema = z.string().refine((value) => normalizeContentLocale(value) === value);
export const setupMediaKindSchema = z.enum(["logo", "banner", "wordmark"]);
export const storedWhitelistSchema = z.array(z.object({
  id: z.string().min(1).max(255),
  uniqueId: z.string().min(1).max(500),
  name: z.string().max(500),
  status: z.enum(["available", "joined"]),
})).max(5000);

export const setupRecordSchema = z.object({
  revision: setupRevisionSchema,
  draft: eventDraftSchema.nullable(),
  branding: z.record(setupLocaleSchema, eventBrandingSchema),
  pendingMedia: z.record(setupLocaleSchema, z.array(setupMediaKindSchema).max(3)),
  publication: publicationSchema.nullable(),
  publishedBranding: z.record(setupLocaleSchema, eventBrandingSchema).optional(),
  whitelist: z.object({
    formId: z.string(),
    fieldId: z.string(),
    kind: z.enum(["email", "short_text", "number"]),
    entries: storedWhitelistSchema,
  }).nullable(),
  recoveredPublication: publicationSchema.optional(),
});

export type SetupRecord = z.infer<typeof setupRecordSchema>;
