import { z } from "zod";

export const setupPasswordBodySchema = z
  .object({
    password: z.string().min(8).max(128),
    confirmPassword: z.string().min(8).max(128),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type SetupPasswordBody = z.infer<typeof setupPasswordBodySchema>;

export function formatZodError(error: z.ZodError) {
  return {
    error: "VALIDATION_ERROR",
    details: error.issues.map((issue) => ({
      path: issue.path.join(".") || "(root)",
      message: issue.message,
    })),
  };
}
