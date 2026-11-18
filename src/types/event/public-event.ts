import type { Form } from "@/types/event/form";
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
  "scheduled" | "closed" | "full" | "restricted" | "unavailable";

export type PublicForm =
  { status: "open"; form: Form } | { status: PublicFormStatus };
