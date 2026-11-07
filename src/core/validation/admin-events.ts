import { z } from "zod";

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug");

const createSharedFields = {
  titleTh: z.string().trim().max(240),
  titleEn: z.string().trim().max(240),
  slug: slugSchema,
};

function requireAtLeastOneTitle(
  data: { titleTh: string; titleEn: string },
  ctx: z.RefinementCtx,
) {
  if (!data.titleTh && !data.titleEn) {
    ctx.addIssue({
      code: "custom",
      message: "At least one of titleTh or titleEn is required",
      path: ["titleTh"],
    });
  }
}

export const createAdminEventBodySchema = z.discriminatedUnion("mode", [
  z
    .object({
      ...createSharedFields,
      mode: z.literal("existing"),
      existingUserId: z.string().uuid(),
    })
    .superRefine(requireAtLeastOneTitle),
  z
    .object({
      ...createSharedFields,
      mode: z.literal("new"),
      adminName: z.string().trim().min(1).max(160),
      adminEmail: z.string().trim().email().max(320),
    })
    .superRefine(requireAtLeastOneTitle),
]);

export const updateAdminEventBodySchema = z
  .object({
    titleTh: z.string().trim().max(240),
    titleEn: z.string().trim().max(240),
    slug: slugSchema,
  })
  .superRefine(requireAtLeastOneTitle);

export const adminEventStatusBodySchema = z.object({
  action: z.enum(["start", "close"]),
  /** Required to close when active/post-event forms still have time left */
  force: z.boolean().optional(),
});

/** Event owner fills schedule/details and moves draft → scheduled */
export const scheduleEventBodySchema = z
  .object({
    startsAt: z.string().min(1),
    endsAt: z.string().min(1),
    description: z.string().max(10000).nullable().optional(),
    locationName: z.string().max(240).nullable().optional(),
    addressText: z.string().max(2000).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    const startMs = Date.parse(data.startsAt);
    const endMs = Date.parse(data.endsAt);
    if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
      ctx.addIssue({
        code: "custom",
        message: "Invalid startsAt or endsAt",
        path: ["startsAt"],
      });
      return;
    }
    if (endMs <= startMs) {
      ctx.addIssue({
        code: "custom",
        message: "endsAt must be after startsAt",
        path: ["endsAt"],
      });
    }
  });

/** @deprecated use scheduleEventBodySchema */
export const submitEventApprovalBodySchema = scheduleEventBodySchema;

export function formatZodError(error: z.ZodError) {
  return {
    error: "VALIDATION_ERROR",
    details: error.issues.map((issue) => ({
      path: issue.path.join(".") || "(root)",
      message: issue.message,
    })),
  };
}

/** Lowercase, spaces/underscores → hyphens, strip other chars. */
export function slugifyEventName(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Prefer English for slug source; Thai alone usually has no Latin chars. */
export function slugifyFromTitles(titleEn: string, titleTh: string): string {
  return slugifyEventName(titleEn) || slugifyEventName(titleTh);
}
