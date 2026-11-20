import { z } from "zod";
import { eventBrandingSchema } from "@/core/event/branding";
import { eventDraftSchema } from "@/core/event/draft";
import { publicationSchema } from "@/core/event/publication";
import { setupLocaleSchema, setupMediaKindSchema, setupRevisionSchema, storedWhitelistSchema } from "@/core/event/setup-state";

const eventId = z.string().min(1).max(255);
const datedDraft = eventDraftSchema.refine(({ startsAt, endsAt }) =>
  !startsAt || !endsAt || Date.parse(endsAt) > Date.parse(startsAt)
);

const brandingPatch = z.object({
  locale: setupLocaleSchema,
  value: eventBrandingSchema,
  pendingMedia: z.array(setupMediaKindSchema).max(3).optional(),
}).strict();

export const setupDraftPatch = z.object({
  eventId,
  revision: setupRevisionSchema,
  draft: eventDraftSchema.optional(),
  branding: brandingPatch.optional(),
}).strict().refine((value) => Boolean(value.draft || value.branding));

export const setupPublishRequest = z.object({
  eventId,
  revision: setupRevisionSchema,
  locale: z.enum(["th", "en"]),
}).strict();

export const setupRecoveryRequest = z.object({
  eventId,
  revision: setupRevisionSchema,
  replace: z.boolean(),
  draft: datedDraft.optional(),
  branding: z.array(brandingPatch).max(2).optional(),
  entries: storedWhitelistSchema.optional(),
  oldPublication: publicationSchema.optional(),
}).strict();
