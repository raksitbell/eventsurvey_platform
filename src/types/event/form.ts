/**
 * Form Builder payload shape — aligned with `feature/form-builder`
 * (`FormBuilder` state). BFF accepts/returns this; mock mapping stays in service.
 */

export const FORM_TYPES = ["registration", "survey"] as const;
export const FORM_LOCALES = ["th", "en"] as const;
export const QUESTIONS_TYPES = [
  "short_text",
  "long_text",
  "email",
  "number",
  "multiple_choice",
  "dropdown",
  "checkbox",
  "date",
  "time",
  "rating",
] as const;

export const UNIQUE_QUESTION_TYPES = [
  "short_text",
  "email",
  "number",
] as const;

export const RATING_DISPLAYS = ["icon", "linear_scale"] as const;
export const RATING_ICONS = ["star", "heart", "like"] as const;

export type RATING_DISPLAY = (typeof RATING_DISPLAYS)[number];
export type ICON = (typeof RATING_ICONS)[number];

export type FormType = (typeof FORM_TYPES)[number];
export type FormLocale = (typeof FORM_LOCALES)[number];
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
  scale_min_label?: string;
  scale_max_label?: string;
}

export interface Label {
  label: string;
  placeholder: string;
  scale_min_label?: string;
  scale_max_label?: string;
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
    min_value?: number | null;
    max_value?: number | null;
    min_length: number;
    max_length: number;
    is_required: boolean;
    is_unique: boolean;
    rating_display: RATING_DISPLAY;
    rating_icon: ICON;
    rating_max: number;
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
  opens_at?: string | null;
  closes_at?: string | null;
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

export interface QuestionFieldProps {
  question: Question["question"];
  locale?: FormLocale;
  choices: Choice[];
  draggedChoiceId?: string | null;
  dragOverChoiceId?: string | null;
  onChoiceDragStart?: (choiceId: string) => void;
  onChoiceDragOver?: (choiceId: string) => void;
  onChoiceDragLeave?: (choiceId: string) => void;
  onChoiceDragEnd?: () => void;
  onAddChoice: () => void;
  onUpdateChoice: (choiceId: string, label: string) => void;
  onDeleteChoice: (choiceId: string) => void;
  onReorderChoice: (sourceChoiceId: string, targetChoiceId: string) => void;
  onUpdateRange?: (min: number, max: number) => void;
  onUpdateNumberBounds?: (min: number | null, max: number | null) => void;
  onUpdateRatingDisplay?: (display: RATING_DISPLAY) => void;
  onUpdateRatingIcon?: (icon: ICON) => void;
  onUpdateLinearLabels?: (minLabel: string, maxLabel: string) => void;
}
