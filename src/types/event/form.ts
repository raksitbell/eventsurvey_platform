/**
 * Form Builder payload shape — aligned with `feature/form-builder`
 * (`FormBuilder` state). BFF accepts/returns this; mock mapping stays in service.
 */

export const FORM_TYPES = ["registration", "survey"] as const;
export const QUESTIONS_TYPES = [
  "short_text",
  "long_text",
  "multiple_choice",
  "dropdown",
  "checkbox",
  "date",
  "time",
  "rating",
] as const;

export type FormType = (typeof FORM_TYPES)[number];
export type QuestionType = (typeof QUESTIONS_TYPES)[number];

export type FormStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "published"
  | "paused"
  | "closed"
  | "archived";

export interface Choice {
  id?: string;
  label: string;
  display_order: number;
}

export interface Label {
  label: string;
  placeholder: string;
  choices: {
    en: Choice[];
    th: Choice[];
  };
}

export interface Question {
  question: {
    id?: string;
    type: QuestionType;
    display_order: number;
    min_number: number;
    max_number: number;
    min_length: number;
    max_length: number;
    required: boolean;
    label: {
      en: Label[];
      th: Label[];
    };
  };
}

/** In-memory / request body shape from FormBuilder */
export interface Form {
  id?: string;
  head: {
    en: {
      title: string;
      description: string;
    };
    th: {
      title: string;
      description: string;
    };
  };
  type: FormType;
  questions: Question[];
}

/** Persisted form returned by BFF (Form + server metadata) */
export interface FormRecord extends Form {
  id: string;
  eventId: string;
  status: FormStatus;
  opensAt: string | null;
  closesAt: string | null;
  acceptingResponses: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** POST body = builder Form + eventId (workspace supplies event) */
export interface FormCreateBody extends Form {
  eventId: string;
}

export interface FormStatusPatchInput {
  status: FormStatus;
  opensAt?: string | null;
  closesAt?: string | null;
  acceptingResponses?: boolean;
}
