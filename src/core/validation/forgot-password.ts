import { z } from "zod";

export const forgotPasswordBodySchema = z.object({
  email: z.email().max(320),
});

export type ForgotPasswordBody = z.infer<typeof forgotPasswordBodySchema>;
