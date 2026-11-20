import type { WhitelistUniqueKind } from "@/types/event/whitelist";
import type { PublicFormAnswerIssue } from "@/core/event/public-form-response";
import type { Form, FormLocale } from "@/types/event/form";
import type {
  ParticipantEventData,
  ParticipantFormKind,
} from "@/types/event/participant";

export interface EventShareLinks {
  event: string;
  registration: string | null;
  survey: string | null;
}

export interface EventShareResponse {
  links: EventShareLinks;
  windows: Record<
    ParticipantFormKind,
    {
      opensAt: string | null;
      closesAt: string | null;
    } | null
  >;
  eventEndsAt: string | null;
}

export interface PublicEvent extends ParticipantEventData {
  formLinks: Partial<
    Record<ParticipantFormKind, { href: string; qrDataUrl?: string }>
  >;
}

export type PublicFormStatus =
  "scheduled" | "closed" | "full" | "restricted" | "registrationRequired" | "unavailable";

export type PublicForm =
  | { status: "open"; form: Form }
  | { status: "scheduled"; form: Form; opensAt: string | null }
  | { status: "eligibility"; fieldType: WhitelistUniqueKind; label: Record<"th" | "en", string> }
  | { status: Exclude<PublicFormStatus, "scheduled"> };

export interface RegistrationProof {
  eventId: string;
  registrationFormId: string;
  submissionId: string;
}

export interface PublicFormSubmissionInput {
  requestId: string;
  locale: FormLocale;
  answers: unknown;
  identifier?: string;
}

export type PublicFormSubmissionResult =
  | { status: "submitted" }
  | { status: "invalid"; errors: Record<string, PublicFormAnswerIssue> }
  | { status: "duplicate" | "requestChanged" }
  | Exclude<PublicForm, { status: "open" }>;
