import type { FormRecord, FormStatus } from "@/types/event/form";

export type SetupFormStatus =
  FormStatus | "published" | "pending_approval" | "approved";

/** Adapt the existing BFF lifecycle to the labels used by the setup screens. */
export function setupFormStatus(
  status?: SetupFormStatus,
): "draft" | "scheduled" | "open" | "closed" {
  if (status === "scheduled" || status === "open") return status;
  if (status === "published") return "open";
  if (status === "pending_approval" || status === "approved")
    return "scheduled";
  if (status && status !== "draft") return "closed";
  return "draft";
}
export function selectSetupForms(forms: FormRecord[]) {
  return {
    registration: forms.find((form) => form.type === "registration") ?? null,
    survey: forms.find((form) => form.type === "survey") ?? null,
  };
}
