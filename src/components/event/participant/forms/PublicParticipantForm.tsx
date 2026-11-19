"use client";

import ParticipantEligibilityGate from "./ParticipantEligibilityGate";
import { normalizeWhitelistId } from "@/core/event/whitelist";
import PreviewHeaderCard from "@/components/event/form/FormPreview/PreviewHeaderCard";
import PreviewQuestionCard from "@/components/event/form/FormPreview/PreviewQuestionCard";
import ParticipantFooter from "../ParticipantFooter";
import ParticipantHeader from "../ParticipantHeader";
import { bannerObjectPosition } from "@/core/event/banner-layout";
import {
  participantColors,
  eventColorForeground,
} from "@/core/event/participant-colors";
import type { EventBranding } from "@/types/event/branding";
import Button from "@/components/ui/button/Button";
import {
  publicAnswerIssue,
  publicQuestionId,
  publicQuestionLocale,
  type PublicFormAnswer,
  type PublicFormAnswerIssue,
} from "@/core/event/public-form-response";
import { Link } from "@/i18n/navigation";
import { completeFormLocale } from "@/core/forms/content";
import type { ParticipantFormKind } from "@/types/event/participant";
import type { PublicForm, PublicFormSubmissionResult } from "@/types/event/public-event";
import { useLocale, useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";

const retryKeyPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function readSubmissionRequestId(storageKey: string) {
  try {
    const previous = globalThis.sessionStorage.getItem(storageKey);
    return previous && retryKeyPattern.test(previous) ? previous : null;
  } catch {
    return null;
  }
}

function newSubmissionRequestId(storageKey: string) {
  const id = globalThis.crypto.randomUUID();
  try { globalThis.sessionStorage.setItem(storageKey, id); } catch { /* Storage is unavailable. */ }
  return id;
}

function forgetSubmissionRequestId(storageKey: string) {
  try { globalThis.sessionStorage.removeItem(storageKey); } catch { /* Storage is unavailable. */ }
}

type PublicParticipantFormProps = {
  kind: ParticipantFormKind;
  result: PublicForm;
  branding: EventBranding;
  bannerUrl: string | null;
  contentLocale?: string | null;
} & (
  | {
      readOnly: true;
      fillViewport?: boolean;
      eventHref?: never;
      registrationHref?: never;
      surveyHref?: never;
      submitResponse?: never;
      recoverSubmission?: never;
      checkEligibility?: never;
    }
  | {
      readOnly?: false;
      fillViewport?: never;
      eventHref: string;
      registrationHref?: string;
      surveyHref?: string;
      submitResponse: (data: FormData) => Promise<PublicFormSubmissionResult>;
      recoverSubmission?: (requestId: string) => Promise<boolean>;
      checkEligibility: (data: FormData) => Promise<PublicForm>;
    }
);

export default function PublicParticipantForm({
  kind,
  eventHref,
  registrationHref,
  surveyHref,
  result,
  branding,
  bannerUrl,
  contentLocale,
  readOnly = false,
  fillViewport = false,
  submitResponse,
  recoverSubmission,
  checkEligibility,
}: PublicParticipantFormProps) {
  const t = useTranslations("publicParticipantForm");
  const participant = useTranslations("participantEvent");
  const preview = useTranslations("form.preview");
  const portalLocale = useLocale();
  const preferredLocale =
    contentLocale === "en" || contentLocale === "th"
      ? contentLocale
      : portalLocale === "en"
        ? "en"
        : "th";
  const instanceId = useId();
  const [response, setResponse] = useState<PublicForm | { status: "submitted"; earlierAnswers: boolean } | null>(null);
  const [granted, setGranted] = useState<{ identifier: string; fieldId?: string } | null>(null);
  const [accessChanged, setAccessChanged] = useState(false);
  const [answers, setAnswers] = useState<Record<string, PublicFormAnswer>>({});
  const [errors, setErrors] = useState<Record<string, PublicFormAnswerIssue>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<"submitError" | "invalidAnswers" | "duplicate" | "requestChanged" | null>(null);
  const requestInFlight = useRef(false);
  const requestId = useRef<string | null>(null);
  const recovery = useRef<{ id: string; result: Promise<boolean> } | null>(null);
  const storageKey = `eventsurvey:form-request:${eventHref}:${kind}`;
  const current = readOnly ? result : response ?? result;
  const status = current.status;
  const form = current.status === "open" ? current.form : null;
  const verifiedId = granted?.fieldId;
  const legacyLocale = !form || form.head[preferredLocale].title.trim()
    ? preferredLocale : preferredLocale === "th" ? "en" : "th";
  const locale = form ? completeFormLocale(form, preferredLocale) ?? legacyLocale : preferredLocale;
  const heading = form?.head[locale].title.trim() || participant(kind);

  const confirmSubmission = useCallback((earlierAnswers: boolean) => {
    forgetSubmissionRequestId(storageKey);
    requestId.current = null;
    setAnswers({});
    setGranted(null);
    setResponse({ status: "submitted", earlierAnswers });
  }, [storageKey]);

  useEffect(() => {
    if (readOnly || !recoverSubmission) return;
    const id = readSubmissionRequestId(storageKey);
    if (!id) return;
    requestId.current = id;
    let active = true;
    if (recovery.current?.id !== id) recovery.current = { id, result: recoverSubmission(id) };
    void recovery.current.result.then((saved) => {
      if (!active || !saved || requestInFlight.current || requestId.current !== id) return;
      confirmSubmission(false);
    }).catch(() => { /* A future retry can recover the same request. */ });
    return () => { active = false; };
  }, [confirmSubmission, readOnly, recoverSubmission, storageKey]);

  // An attendee can complete registration in another tab or return after the form opens.
  useEffect(() => {
    if (readOnly || !checkEligibility ||
      (status !== "registrationRequired" && status !== "scheduled" && status !== "full")) return;
    let active = true;
    const refresh = () => {
      if (globalThis.document.visibilityState !== "visible") return;
      const data = new FormData();
      if (granted) data.set("identifier", granted.identifier);
      void checkEligibility(data).then((next) => {
        if (active) setResponse((previous) => previous?.status === "submitted" ? previous : next);
      }).catch(() => { /* Keep the current state on a transient read failure. */ });
    };
    globalThis.document.addEventListener("visibilitychange", refresh);
    return () => {
      active = false;
      globalThis.document.removeEventListener("visibilitychange", refresh);
    };
  }, [checkEligibility, granted, readOnly, status]);

  function receiveEligibility(next: PublicForm, value: string) {
    if (next.status === "open" && current.status === "eligibility") {
      const identifier = normalizeWhitelistId(value, current.fieldType);
      const unique = kind === "registration" && next.form.questions.find(({ question }) => question.is_unique);
      const fieldId = unique ? publicQuestionId(unique.question) : undefined;
      setGranted({ identifier, fieldId });
      setAccessChanged(false);
      setAnswers((previous) => {
        const retained = granted?.identifier === identifier ? previous : {};
        return fieldId ? { ...retained, [fieldId]: identifier } : retained;
      });
      setErrors({});
      setSubmitError(null);
    }
    setResponse(next);
  }

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

  function showInvalidAnswers(issues: Record<string, PublicFormAnswerIssue>) {
    setErrors(issues);
    const first = Object.keys(issues)[0];
    if (!first) return;
    globalThis.requestAnimationFrame(() => {
      const card = globalThis.document.getElementById(`preview-q-${first}`);
      card?.scrollIntoView({ block: "center" });
      card?.querySelector<HTMLElement>("input:not(:disabled), select:not(:disabled), textarea:not(:disabled), button:not(:disabled)")
        ?.focus({ preventScroll: true });
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (readOnly || !form || !submitResponse || requestInFlight.current) return;
    setSubmitError(null);

    const nextErrors: Record<string, PublicFormAnswerIssue> = {};
    for (const { question } of form.questions) {
      const id = publicQuestionId(question);
      const issue = publicAnswerIssue(question, answers[id], locale);
      if (issue) nextErrors[id] = issue;
    }
    if (Object.keys(nextErrors).length) {
      showInvalidAnswers(nextErrors);
      return;
    }

    requestInFlight.current = true;
    setSubmitting(true);
    setErrors({});
    try {
      // The tab keeps only an opaque retry key. Answers and invitation identifiers stay in memory.
      requestId.current ??= readSubmissionRequestId(storageKey) ?? newSubmissionRequestId(storageKey);
      const data = new FormData();
      data.set("requestId", requestId.current);
      data.set("answers", JSON.stringify(answers));
      data.set("locale", locale);
      if (granted) data.set("identifier", granted.identifier);
      const next = await submitResponse(data);
      switch (next.status) {
        case "invalid":
          showInvalidAnswers(next.errors);
          setSubmitError("invalidAnswers");
          return;
        case "duplicate":
          setSubmitError("duplicate");
          return;
        case "requestChanged":
          if (recoverSubmission && await recoverSubmission(requestId.current)) {
            confirmSubmission(true);
            globalThis.window.scrollTo({ top: 0 });
            return;
          }
          forgetSubmissionRequestId(storageKey);
          requestId.current = null;
          setSubmitError("requestChanged");
          return;
        case "submitted":
          confirmSubmission(false);
          globalThis.window.scrollTo({ top: 0 });
          return;
        case "eligibility":
          setAccessChanged(true);
          break;
      }
      setResponse(next);
      globalThis.window.scrollTo({ top: 0 });
    } catch {
      setSubmitError("submitError");
    } finally {
      requestInFlight.current = false;
      setSubmitting(false);
    }
  }

  const fields =
    status === "open" && form ? (
      <fieldset disabled={readOnly || submitting} className="flex flex-col gap-4">
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
          const card = (
            <PreviewQuestionCard
              key={id}
              question={{
                ...question,
                id: readOnly ? `${instanceId}-${id}` : id,
                is_unique: false,
              }}
              locale={questionLocale}
              answer={answers[id]}
              errorMessage={formatIssue(errors[id])}
              onChangeAnswer={(answer) => updateAnswer(id, answer)}
              onToggleCheckbox={(choiceId) => toggleCheckbox(id, choiceId)}
              onClearAnswer={() => updateAnswer(id, "")}
            />
          );
          return id === verifiedId ? <fieldset key={id} disabled>{card}</fieldset> : card;
        })}
        {submitError && <p role="alert" className="rounded-lg bg-white p-3 text-error-700 dark:bg-gray-900 dark:text-error-300">{t(submitError)}</p>}
        <div className="flex flex-wrap gap-3">
          <Button
            type={readOnly ? "button" : "submit"}
            disabled={readOnly || submitting}
            className={`bg-(--participant-accent)! text-(--participant-on-accent)! hover:brightness-95 ${readOnly ? "opacity-100!" : ""}`}
          >
            {t(submitting ? "submitting" : "submit")}
          </Button>
          <Button
            variant="outline"
            className={readOnly ? "opacity-100!" : undefined}
            disabled={readOnly || submitting}
            onClick={() => {
              setAnswers(verifiedId && granted ? { [verifiedId]: granted.identifier } : {});
              setErrors({});
              setSubmitError(null);
            }}
          >
            {preview("clearForm")}
          </Button>
        </div>
      </fieldset>
    ) : null;

  const colors = participantColors(branding);
  const banner = branding.banner?.url ?? bannerUrl;
  const gradient =
    branding.backgroundMode === "gradient"
      ? `linear-gradient(${branding.gradientAngle ?? 0}deg, ${branding.secondary}, ${branding.gradientEnd ?? branding.primary})`
      : undefined;
  const style = {
    ...colors,
    "--participant-on-accent": eventColorForeground(branding.accent),
    "--color-brand-500": colors["--participant-control-text"],
  } as CSSProperties;
  const Container = readOnly ? "section" : "main";
  const pageHeight = fillViewport ? "grow shrink-0" : readOnly ? "" : "min-h-dvh";
  const backClass =
    "inline-block rounded-md bg-(--participant-secondary) px-2 py-1 font-medium text-(--participant-link)";
  return (
    <Container
      style={style}
      className={`@container/participant flex w-full min-w-0 flex-col bg-(--participant-secondary) ${pageHeight}`}
    >
      <ParticipantHeader
        branding={branding}
        readOnly={readOnly}
        contentLocale={locale}
      />
      <div
        className="relative isolate flex-1 overflow-hidden px-4 py-6 @4xl/participant:py-10"
        style={{ backgroundImage: gradient }}
      >
        {branding.backgroundMode === "blur" && banner && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-1 scale-110 bg-cover opacity-60 blur-lg"
            style={{
              backgroundImage: `url(${JSON.stringify(banner)})`,
              backgroundPosition: bannerObjectPosition(
                branding.banner?.cropPosition,
              ),
            }}
          />
        )}
        <div className="mx-auto max-w-2xl space-y-4 text-gray-900 dark:text-gray-100">
          {eventHref ? (
            <Link href={eventHref} className={`${backClass} hover:underline`}>
              {t("backToEvent")}
            </Link>
          ) : (
            <span className={backClass}>{t("backToEvent")}</span>
          )}
          {fields ? (
            readOnly ? (
              fields
            ) : (
              <form onSubmit={submit} noValidate>
                {fields}
              </form>
            )
          ) : current.status === "eligibility" && checkEligibility ? (
            <ParticipantEligibilityGate
              gate={current}
              locale={preferredLocale}
              accessChanged={accessChanged}
              verify={checkEligibility}
              onResult={receiveEligibility}
            />
          ) : (
            <section className="space-y-3 rounded-xl border border-gray-200 bg-white px-5 py-6 dark:border-gray-800 dark:bg-gray-900">
              <h1 className="text-title-sm font-semibold">{heading}</h1>
              <p role="status" className="text-gray-700 dark:text-gray-300">
                {t(
                  status === "submitted"
                    ? kind === "registration" ? "registrationSubmitted" : "surveySubmitted"
                    : status === "eligibility"
                      ? "restricted"
                      : status === "open"
                        ? "unavailable"
                        : status,
                )}
              </p>
              {current.status === "submitted" && current.earlierAnswers && <p>{t("earlierAnswersSaved")}</p>}
              {status === "registrationRequired" && registrationHref && (
                <Link href={registrationHref} className={backClass}>{t("goToRegistration")}</Link>
              )}
              {status === "submitted" && kind === "registration" && surveyHref && (
                <Link href={surveyHref} prefetch={false} className={backClass}>{t("goToSurvey")}</Link>
              )}
            </section>
          )}
        </div>
      </div>
      <ParticipantFooter readOnly={readOnly} />
    </Container>
  );
}
