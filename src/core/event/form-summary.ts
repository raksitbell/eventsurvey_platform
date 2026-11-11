import type { FormRecord, FormStatus } from "@/types/event/form";

/** Adapt the existing BFF lifecycle to the labels used by the setup screens. */
export function setupFormStatus(
  status?: FormStatus,
): "draft" | "scheduled" | "open" | "closed" {
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
