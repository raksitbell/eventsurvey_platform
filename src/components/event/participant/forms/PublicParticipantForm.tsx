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
import type { PublicForm } from "@/types/event/public-event";
import { useLocale, useTranslations } from "next-intl";
import {
  useId,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";

type PublicParticipantFormProps = {
  kind: ParticipantFormKind;
  result: PublicForm;
  branding: EventBranding;
  bannerUrl: string | null;
  contentLocale?: string | null;
} & (
  | { readOnly: true; fillViewport?: boolean; eventHref?: never; checkAvailability?: never; checkEligibility?: never }
  | {
      readOnly?: false;
      fillViewport?: never;
      eventHref: string;
      checkAvailability: (data?: FormData) => Promise<PublicForm["status"]>;
      checkEligibility: (data: FormData) => Promise<PublicForm>;
    }
);

export default function PublicParticipantForm({
  kind,
  eventHref,
  result,
  branding,
  bannerUrl,
  contentLocale,
  readOnly = false,
  fillViewport = false,
  checkAvailability,
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
  const [liveStatus, setStatus] = useState<PublicForm["status"] | "submitted">(
    result.status,
  );
  const [granted, setGranted] = useState<{
    result: Extract<PublicForm, { status: "open" }>;
    identifier: string;
    fieldId?: string;
  } | null>(null);
  const [accessChanged, setAccessChanged] = useState(false);
  const [answers, setAnswers] = useState<Record<string, PublicFormAnswer>>({});
  const [errors, setErrors] = useState<Record<string, PublicFormAnswerIssue>>(
    {},
  );
  const [checking, setChecking] = useState(false);
  const [checkFailed, setCheckFailed] = useState(false);
  const requestInFlight = useRef(false);
  const status = readOnly ? result.status : liveStatus;
  const form = result.status === "open" ? result.form : granted?.result.form ?? null;
  const verifiedId = granted?.fieldId;
  const legacyLocale = !form || form.head[preferredLocale].title.trim()
    ? preferredLocale : preferredLocale === "th" ? "en" : "th";
  const locale = form ? completeFormLocale(form, preferredLocale) ?? legacyLocale : preferredLocale;
  const heading = form?.head[locale].title.trim() || participant(kind);

  function receiveEligibility(next: PublicForm, value: string) {
    if (next.status === "open" && result.status === "eligibility") {
      const identifier = normalizeWhitelistId(value, result.fieldType);
      const unique = kind === "registration" && next.form.questions.find(({ question }) => question.is_unique);
      const fieldId = unique ? publicQuestionId(unique.question) : undefined;
      setGranted({ result: next, identifier, fieldId });
      setAccessChanged(false);
      setAnswers(fieldId ? { [fieldId]: identifier } : {});
      setCheckFailed(false);
    }
    setStatus(next.status);
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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form || !checkAvailability || requestInFlight.current) return;
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
      const proof = new FormData();
      if (granted) proof.set("identifier", granted.identifier);
      const availability = await checkAvailability(proof);
      if (availability !== "open") setGranted(null);
      if (availability === "eligibility") setAccessChanged(true);
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

  const fields =
    status === "open" && form ? (
      <fieldset disabled={readOnly || checking} className="flex flex-col gap-4">
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
        {checkFailed && <p role="alert">{t("recheckError")}</p>}
        <div className="flex flex-wrap gap-3">
          <Button
            type={readOnly ? "button" : "submit"}
            disabled={readOnly || checking}
            className={`bg-(--participant-accent)! text-(--participant-on-accent)! hover:brightness-95 ${readOnly ? "opacity-100!" : ""}`}
          >
            {t(checking ? "submitting" : "submitDemo")}
          </Button>
          <Button
            variant="outline"
            className={readOnly ? "opacity-100!" : undefined}
            disabled={readOnly || checking}
            onClick={() => {
              setAnswers(verifiedId && granted ? { [verifiedId]: granted.identifier } : {});
              setErrors({});
              setCheckFailed(false);
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
        device="desktop"
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
          ) : status === "eligibility" && result.status === "eligibility" && checkEligibility ? (
            <ParticipantEligibilityGate
              gate={result}
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
                    ? "demoSubmitted"
                    : status === "eligibility"
                      ? "restricted"
                      : status === "open"
                        ? "unavailable"
                        : status,
                )}
              </p>
            </section>
          )}
        </div>
      </div>
      <ParticipantFooter readOnly={readOnly} />
    </Container>
  );
}
