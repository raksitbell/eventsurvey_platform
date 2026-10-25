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

export interface Label {
    label: string;
    placeholder: string;
    choices: {
        en: Choice[];
        th: Choice[];
    }
}

export interface Choice {
    id?: string;
    label: string;
    display_order: number;
}

export interface QuestionFieldProps {
    question: Question["question"];
    choices: Choice[];
    onAddChoice: () => void;
    onUpdateChoice: (choiceId: string, label: string) => void;
    onDeleteChoice: (choiceId: string) => void;
    onReorderChoice: (sourceChoiceId: string, targetChoiceId: string) => void;
    onUpdateRange?: (min: number, max: number) => void;
}
