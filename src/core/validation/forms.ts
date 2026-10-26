import { z } from "zod";

const formTypeSchema = z.enum(["registration", "survey"]);

const formStatusSchema = z.enum([
  "draft",
  "pending_approval",
  "approved",
  "rejected",
  "published",
  "paused",
  "closed",
  "archived",
]);

const questionTypeSchema = z.enum([
  "short_text",
  "long_text",
  "multiple_choice",
  "dropdown",
  "checkbox",
  "date",
  "time",
  "rating",
]);

const choiceSchema = z.object({
  id: z.uuid().optional(),
  label: z.string(),
  display_order: z.number().int().positive(),
});

const labelSchema = z.object({
  label: z.string(),
  placeholder: z.string(),
  choices: z.object({
    en: z.array(choiceSchema),
    th: z.array(choiceSchema),
  }),
});

const questionSchema = z
  .object({
    question: z.object({
      id: z.uuid().optional(),
      type: questionTypeSchema,
      display_order: z.number().int().positive(),
      min_number: z.number(),
      max_number: z.number(),
      min_length: z.number().int().nonnegative(),
      max_length: z.number().int().nonnegative(),
      required: z.boolean(),
      label: z.object({
        en: z.array(labelSchema).min(1),
        th: z.array(labelSchema).min(1),
      }),
    }),
  })
  .superRefine((item, ctx) => {
    const q = item.question;
    if (q.min_number > q.max_number) {
      ctx.addIssue({
        code: "custom",
        message: "min_number must be <= max_number",
        path: ["question", "min_number"],
      });
    }
    if (q.min_length > 0 && q.max_length > 0 && q.min_length > q.max_length) {
      ctx.addIssue({
        code: "custom",
        message: "min_length must be <= max_length",
        path: ["question", "min_length"],
      });
    }
  });

const headLocaleSchema = z.object({
  title: z.string().trim().min(1).max(240),
  description: z.string().max(5000),
});

const formShapeSchema = z.object({
  id: z.uuid().optional(),
  head: z.object({
    en: headLocaleSchema,
    th: headLocaleSchema,
  }),
  type: formTypeSchema,
  questions: z.array(questionSchema),
});

function refineQuestions(
  questions: z.infer<typeof questionSchema>[],
  ctx: z.RefinementCtx,
) {
  const orders = new Set<number>();
  for (const [index, item] of questions.entries()) {
    const order = item.question.display_order;
    if (orders.has(order)) {
      ctx.addIssue({
        code: "custom",
        message: "display_order must be unique",
        path: ["questions", index, "question", "display_order"],
      });
    }
    orders.add(order);

    const enChoices = item.question.label.en[0]?.choices.en ?? [];
    const choiceOrders = new Set<number>();
    for (const [ci, choice] of enChoices.entries()) {
      if (choiceOrders.has(choice.display_order)) {
        ctx.addIssue({
          code: "custom",
          message: "choice display_order must be unique",
          path: [
            "questions",
            index,
            "question",
            "label",
            "en",
            0,
            "choices",
            "en",
            ci,
            "display_order",
          ],
        });
      }
      choiceOrders.add(choice.display_order);
    }
  }
}

/** POST /api/event/forms — builder Form + eventId */
export const createFormBodySchema = formShapeSchema
  .extend({
    eventId: z.uuid(),
  })
  .superRefine((body, ctx) => refineQuestions(body.questions, ctx));

/** PUT /api/event/forms/[id] — builder Form (eventId/type optional) */
export const updateFormBodySchema = formShapeSchema
  .extend({
    eventId: z.uuid().optional(),
  })
  .superRefine((body, ctx) => refineQuestions(body.questions, ctx));

export const formStatusPatchSchema = z.object({
  status: formStatusSchema,
  opensAt: z.iso.datetime().nullable().optional(),
  closesAt: z.iso.datetime().nullable().optional(),
  acceptingResponses: z.boolean().optional(),
});

export type CreateFormBody = z.infer<typeof createFormBodySchema>;
export type UpdateFormBody = z.infer<typeof updateFormBodySchema>;
export type FormStatusPatchBody = z.infer<typeof formStatusPatchSchema>;

const CHOICE_TYPES = new Set([
  "multiple_choice",
  "checkbox",
  "dropdown",
]);

/** Extra checks when publishing. */
export function validatePublishReady(input: {
  head: { en: { title: string }; th: { title: string } };
  questions: {
    question: {
      type: string;
      label: { en: { choices: { en: unknown[] } }[] };
    };
  }[];
}): string | null {
  if (input.questions.length < 1) {
    return "Published form requires at least one question";
  }
  if (!input.head.en.title.trim() || !input.head.th.title.trim()) {
    return "Published form requires th and en titles";
  }
  for (const item of input.questions) {
    const type = item.question.type;
    const options = item.question.label.en[0]?.choices.en ?? [];
    if (CHOICE_TYPES.has(type) && options.length < 1) {
      return `Choice question type "${type}" requires at least one option`;
    }
  }
  return null;
}

export function formatZodError(error: z.ZodError): {
  error: string;
  details: { path: string; message: string }[];
} {
  return {
    error: "VALIDATION_ERROR",
    details: error.issues.map((issue) => ({
      path: issue.path.join(".") || "(root)",
      message: issue.message,
    })),
  };
}
