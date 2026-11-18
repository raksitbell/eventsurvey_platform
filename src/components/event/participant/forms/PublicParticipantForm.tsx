"use client";

import PreviewHeaderCard from "@/components/event/form/FormPreview/PreviewHeaderCard";
import PreviewQuestionCard from "@/components/event/form/FormPreview/PreviewQuestionCard";
import Button from "@/components/ui/button/Button";
import {
  publicAnswerIssue,
  publicQuestionId,
  publicQuestionLocale,
  type PublicFormAnswer,
  type PublicFormAnswerIssue,
} from "@/core/event/public-form-response";
import { Link } from "@/i18n/navigation";
import type { FormLocale } from "@/types/event/form";
import type { ParticipantFormKind } from "@/types/event/participant";
import type { PublicForm, PublicFormStatus } from "@/types/event/public-event";
import { useLocale, useTranslations } from "next-intl";
import { useRef, useState, type FormEvent } from "react";

interface PublicParticipantFormProps {
  kind: ParticipantFormKind;
  eventHref: string;
  result: PublicForm;
  checkAvailability: () => Promise<"open" | PublicFormStatus>;
}

export default function PublicParticipantForm({
  kind,
  eventHref,
  result,
  checkAvailability,
}: PublicParticipantFormProps) {
  const t = useTranslations("publicParticipantForm");
  const participant = useTranslations("participantEvent");
  const preview = useTranslations("form.preview");
  const preferredLocale = useLocale() === "en" ? "en" : "th";
  const [status, setStatus] = useState<PublicForm["status"] | "submitted">(
    result.status,
  );
  const [answers, setAnswers] = useState<Record<string, PublicFormAnswer>>({});
  const [errors, setErrors] = useState<Record<string, PublicFormAnswerIssue>>(
    {},
  );
  const [checking, setChecking] = useState(false);
  const [checkFailed, setCheckFailed] = useState(false);
  const requestInFlight = useRef(false);
  const form = result.status === "open" ? result.form : null;
  const locale: FormLocale = form?.head[preferredLocale].title.trim()
    ? preferredLocale
    : preferredLocale === "th"
      ? "en"
      : "th";
  const heading = form?.head[locale].title.trim() || participant(kind);

  function clearAnswerError(id: string) {
    setErrors((previous) => {
      const next = { ...previous };
      delete next[id];
      return next;
    });
  }

  function updateAnswer(id: string, value: PublicFormAnswer) {
    setAnswers((previous) => ({ ...previous, [id]: value }));
    clearAnswerError(id);
  }

  function toggleCheckbox(id: string, choiceId: string) {
    setAnswers((previous) => {
      const stored = previous[id];
      const current = Array.isArray(stored) ? stored : [];
      const next = current.includes(choiceId)
        ? current.filter((value) => value !== choiceId)
        : [...current, choiceId];
      return { ...previous, [id]: next };
    });
    clearAnswerError(id);
  }

  function formatIssue(issue: PublicFormAnswerIssue | undefined) {
    if (!issue) return undefined;
    switch (issue.key) {
      case "invalidAnswer":
        return t(issue.key);
      case "numberRangeError":
        return preview(issue.key, { min: issue.min, max: issue.max });
      case "numberMinError":
        return preview(issue.key, { min: issue.min });
      case "numberMaxError":
        return preview(issue.key, { max: issue.max });
      default:
        return preview(issue.key);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form || requestInFlight.current) return;
    setCheckFailed(false);

    const nextErrors: Record<string, PublicFormAnswerIssue> = {};
    for (const { question } of form.questions) {
      const id = publicQuestionId(question);
      const issue = publicAnswerIssue(question, answers[id], locale);
      if (issue) nextErrors[id] = issue;
    }
    setErrors(nextErrors);

    const firstError = Object.keys(nextErrors)[0];
    if (firstError) {
      globalThis.document
        .getElementById(`preview-q-${firstError}`)
        ?.scrollIntoView({ block: "center" });
      return;
    }

    requestInFlight.current = true;
    setChecking(true);
    try {
      // Answers remain in this tab. The Server Action checks availability only.
      const availability = await checkAvailability();
      setAnswers({});
      setStatus(availability === "open" ? "submitted" : availability);
      globalThis.window.scrollTo({ top: 0 });
    } catch {
      setCheckFailed(true);
    } finally {
      requestInFlight.current = false;
      setChecking(false);
    }
  }

  return (
    <main className="min-h-dvh bg-gray-50 px-4 py-6 text-gray-900 sm:py-10 dark:bg-gray-950 dark:text-gray-100">
      <div className="mx-auto max-w-2xl space-y-4">
        <Link
          href={eventHref}
          className="inline-block font-medium text-brand-700 hover:underline dark:text-brand-300"
        >
          {t("backToEvent")}
        </Link>
        {status === "open" && form ? (
          <form onSubmit={submit} noValidate>
            <fieldset disabled={checking} className="flex flex-col gap-4">
              <PreviewHeaderCard
                title={heading}
                description={form.head[locale].description}
                hasRequiredQuestion={form.questions.some(
                  ({ question }) => question.is_required,
                )}
              />
              {form.questions.map(({ question }) => {
                const id = publicQuestionId(question);
                const questionLocale = publicQuestionLocale(question, locale);
                return (
                  <PreviewQuestionCard
                    key={id}
                    question={{ ...question, id, is_unique: false }}
                    locale={questionLocale}
                    answer={answers[id]}
                    errorMessage={formatIssue(errors[id])}
                    onChangeAnswer={(answer) => updateAnswer(id, answer)}
                    onToggleCheckbox={(choiceId) =>
                      toggleCheckbox(id, choiceId)
                    }
                    onClearAnswer={() => updateAnswer(id, "")}
                  />
                );
              })}
              {checkFailed && <p role="alert">{t("recheckError")}</p>}
              <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={checking}>
                  {t(checking ? "submitting" : "submitDemo")}
                </Button>
                <Button
                  variant="outline"
                  disabled={checking}
                  onClick={() => {
                    setAnswers({});
                    setErrors({});
                    setCheckFailed(false);
                  }}
                >
                  {preview("clearForm")}
                </Button>
              </div>
            </fieldset>
          </form>
        ) : (
          <section className="space-y-3 rounded-xl border border-gray-200 bg-white px-5 py-6 dark:border-gray-800 dark:bg-gray-900">
            <h1 className="text-title-sm font-semibold">{heading}</h1>
            <p role="status" className="text-gray-700 dark:text-gray-300">
              {t(
                status === "submitted"
                  ? "demoSubmitted"
                  : status === "open"
                    ? "unavailable"
                    : status,
              )}
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
