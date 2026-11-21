"use client";

import { createAnswerDrafts, emptyAnswerDraft } from "@/core/event/participant-answer-draft";
import ParticipantCapacityDialog from "./ParticipantCapacityDialog";
import ParticipantEligibilityGate from "./ParticipantEligibilityGate";
import { normalizeWhitelistId } from "@/core/event/whitelist";
import ParticipantFormLayout from "./ParticipantFormLayout";
import { CheckCircleIcon, InformationCircleIcon } from "@heroicons/react/24/outline";
import PreviewQuestionCard from "@/components/event/form/FormPreview/PreviewQuestionCard";
import type { EventBranding } from "@/types/event/branding";
import Button from "@/components/ui/button/Button";
import {
  publicAnswerIssue,
  publicQuestionId,
  type PublicFormAnswer,
  type PublicFormAnswerIssue,
} from "@/core/event/public-form-response";
import { Link } from "@/i18n/navigation";
import { completeFormLocale } from "@/core/forms/content";
import { formatDateTime } from "@/core/i18n/format-datetime";
import type { ParticipantFormEventDetails, ParticipantFormKind } from "@/types/event/participant";
import type { PublicForm, PublicFormSubmissionResult } from "@/types/event/public-event";
import { useLocale, useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";

const retryKeyPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface PendingRequest { id: string; draftScope?: string }

function readSubmissionRequest(storageKey: string): PendingRequest | null {
  try {
    const previous = globalThis.sessionStorage.getItem(storageKey);
    if (!previous) return null;
    // Older tabs stored the UUID alone.
    if (retryKeyPattern.test(previous)) return { id: previous };
    const parsed = JSON.parse(previous);
    return typeof parsed?.id === "string" && retryKeyPattern.test(parsed.id)
      && typeof parsed.draftScope === "string" && /^[a-f0-9]{64}$/.test(parsed.draftScope)
      ? { id: parsed.id, draftScope: parsed.draftScope } : null;
  } catch {
    return null;
  }
}

function newSubmissionRequest(storageKey: string, draftScope?: string): PendingRequest {
  const request = { id: globalThis.crypto.randomUUID(), draftScope };
  try {
    globalThis.sessionStorage.setItem(storageKey, draftScope ? JSON.stringify(request) : request.id);
  } catch { /* Keep the request ID in memory for retries on this page. */ }
  return request;
}

function forgetSubmissionRequestId(storageKey: string) {
  try { globalThis.sessionStorage.removeItem(storageKey); } catch { /* Storage is unavailable. */ }
}

type PublicParticipantFormProps = {
  kind: ParticipantFormKind;
  branding: EventBranding;
  bannerUrl: string | null;
  eventDetails: ParticipantFormEventDetails;
  contentLocale?: string | null;
  defaultContentLocale?: string;
  languages?: string[];
} & (
  | {
      readOnly: true;
      result: PublicForm | { status: "previewEmpty" | "previewDisabled" | "previewRestricted" };
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
      result: PublicForm;
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
  eventDetails,
  contentLocale,
  defaultContentLocale,
  languages,
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
      : (defaultContentLocale ?? "th") === "en"
        ? "en"
        : "th";
  const instanceId = useId();
  const [response, setResponse] = useState<PublicForm | { status: "submitted"; earlierAnswers: boolean } | null>(null);
  const [granted, setGranted] = useState<{ identifier: string; fieldId?: string } | null>(null);
  const [accessChanged, setAccessChanged] = useState(false);
  const [drafts] = useState(createAnswerDrafts);
  const [cleanupFailed, setCleanupFailed] = useState(false);
  const [errors, setErrors] = useState<Record<string, PublicFormAnswerIssue>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<"submitError" | "invalidAnswers" | "duplicate" | "requestChanged" | null>(null);
  const requestInFlight = useRef(false);
  const pendingRequest = useRef<PendingRequest | null>(null);
  const recovery = useRef<{ id: string; result: Promise<boolean> } | null>(null);
  const storageKey = `eventsurvey:form-request:${eventHref?.split("?")[0]}:${kind}`;
  const current = readOnly ? result : response ?? result;
  const status = current.status;
  const form = current.status === "open" || current.status === "scheduled" ? current.form : null;
  const opensAt = current.status === "scheduled" ? current.opensAt : null;
  const cannotSubmit = readOnly || status !== "open" || submitting;
  const verifiedId = granted?.fieldId;
  const draftScope = !readOnly && (current.status === "open" || current.status === "scheduled") ? current.draftScope : undefined;
  const draft = useSyncExternalStore(drafts.subscribe, () => drafts.read(draftScope), () => emptyAnswerDraft);
  const answers: Record<string, PublicFormAnswer> = {};
  for (const { question } of form?.questions ?? []) {
    const id = publicQuestionId(question);
    if (Object.hasOwn(draft.answers, id)) answers[id] = draft.answers[id];
  }
  if (verifiedId && granted) answers[verifiedId] = granted.identifier;
  const legacyLocale = !form || form.head[preferredLocale].title.trim()
    ? preferredLocale : preferredLocale === "th" ? "en" : "th";
  const locale = form ? completeFormLocale(form, preferredLocale) ?? legacyLocale : preferredLocale;
  const heading = form?.head[locale].title.trim() || participant(kind);

  const confirmSubmission = useCallback((earlierAnswers: boolean) => {
    const scope = pendingRequest.current?.draftScope ?? draftScope;
    const cleaned = !scope || drafts.write(scope, {});
    setCleanupFailed(!cleaned);
    if (cleaned) forgetSubmissionRequestId(storageKey);
    pendingRequest.current = null;
    setGranted(null);
    setResponse({ status: "submitted", earlierAnswers });
  }, [draftScope, drafts, storageKey]);

  useEffect(() => {
    if (readOnly || status === "submitted" || !recoverSubmission) return;
    const pending = readSubmissionRequest(storageKey);
    if (!pending || (draftScope && pending.draftScope && pending.draftScope !== draftScope)) return;
    const { id } = pending;
    pendingRequest.current = pending;
    let active = true;
    if (recovery.current?.id !== id) recovery.current = { id, result: recoverSubmission(id) };
    void recovery.current.result.then((saved) => {
      if (!active || !saved || requestInFlight.current || pendingRequest.current?.id !== id) return;
      confirmSubmission(false);
    }).catch(() => { /* A future retry can recover the same request. */ });
    return () => { active = false; };
  }, [confirmSubmission, draftScope, readOnly, recoverSubmission, storageKey, status]);

  // Recheck the server when the window opens, or when a guest returns after registering elsewhere.
  useEffect(() => {
    if (readOnly || !checkEligibility ||
      (status !== "registrationRequired" && status !== "scheduled" && status !== "full")) return;
    let active = true;
    let checking = false;
    let timer: number;
    async function refresh() {
      if (checking || !active || globalThis.document.visibilityState !== "visible" || !checkEligibility) return;
      checking = true;
      const data = new FormData();
      if (granted) data.set("identifier", granted.identifier);
      try {
        const next = await checkEligibility(data);
        if (active) setResponse((previous) => previous?.status === "submitted" ? previous : next);
      } catch { /* The form remains locked until the server confirms it is open. */ }
      finally { checking = false; }
    }
    if (status === "scheduled") {
      const opening = opensAt ? Date.parse(opensAt) : NaN;
      // Long timeouts overflow in browsers. Recalculate distant opening dates without polling the API.
      function scheduleCheck() {
        const delay = opening - Date.now();
        if (delay > 0) {
          timer = globalThis.window.setTimeout(scheduleCheck, Math.min(delay, 2_147_483_647));
        } else {
          void refresh();
          timer = globalThis.window.setTimeout(scheduleCheck, 30_000);
        }
      }
      if (Number.isFinite(opening)) scheduleCheck();
      else timer = globalThis.window.setTimeout(scheduleCheck, 30_000);
    }
    globalThis.document.addEventListener("visibilitychange", refresh);
    return () => {
      active = false;
      globalThis.clearTimeout(timer);
      globalThis.document.removeEventListener("visibilitychange", refresh);
    };
  }, [checkEligibility, granted, opensAt, readOnly, status]);

  function receiveEligibility(next: PublicForm, value: string) {
    if ((next.status === "open" || next.status === "scheduled") && current.status === "eligibility") {
      const identifier = normalizeWhitelistId(value, current.fieldType);
      const unique = kind === "registration" && next.form.questions.find(({ question }) => question.is_unique);
      const fieldId = unique ? publicQuestionId(unique.question) : undefined;
      setGranted({ identifier, fieldId });
      setAccessChanged(false);
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
    if (!draftScope || id === verifiedId) return;
    const next = { ...answers, [id]: value };
    if (verifiedId) delete next[verifiedId];
    drafts.write(draftScope, next);
    clearAnswerError(id);
  }

  function toggleCheckbox(id: string, choiceId: string) {
    const stored = answers[id];
    const values = Array.isArray(stored) ? stored : [];
    updateAnswer(id, values.includes(choiceId)
      ? values.filter((value) => value !== choiceId)
      : [...values, choiceId]);
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
    if (cannotSubmit || !form || !submitResponse || requestInFlight.current) return;
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
      const existing = pendingRequest.current ?? readSubmissionRequest(storageKey);
      const request = existing && (!existing.draftScope || existing.draftScope === draftScope)
        ? existing : newSubmissionRequest(storageKey, draftScope);
      pendingRequest.current = request;
      const data = new FormData();
      data.set("requestId", request.id);
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
          if (recoverSubmission && await recoverSubmission(request.id)) {
            confirmSubmission(true);
            globalThis.window.scrollTo({ top: 0 });
            return;
          }
          forgetSubmissionRequestId(storageKey);
          pendingRequest.current = null;
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

  const verifiedRegistration = !readOnly && kind === "survey" && eventDetails.surveyAccess === "registered_only";
  const verifiedInvitation = !readOnly && kind === "registration" && eventDetails.isPrivate && granted !== null;
  const fields =
    form ? (
      <fieldset disabled={readOnly || submitting} className="flex min-w-0 flex-col gap-4">
        <div className="space-y-2 border-b border-preview-border pb-4">
          <h1 className="text-2xl leading-snug font-bold wrap-anywhere @4xl/participant:text-3xl">{heading}</h1>
          {form.head[locale].description && (
            <p className="text-theme-sm whitespace-pre-line text-participant-muted">{form.head[locale].description}</p>
          )}
        </div>
        {status === "scheduled" && (
          <p role="status" className="flex items-center gap-2 rounded-lg bg-event-display-tint p-3 text-theme-sm font-semibold">
            <InformationCircleIcon className="size-5 shrink-0" aria-hidden="true" />
            {opensAt ? t("acceptingAt", { time: formatDateTime(opensAt, portalLocale === "en" ? "en" : "th", {
              dateStyle: "medium", timeStyle: "short", hourCycle: "h23", timeZone: "Asia/Bangkok",
            }) }) : t("scheduled")}
          </p>
        )}
        {readOnly && !form.questions.length && <p className="text-theme-sm text-participant-muted">{t("previewEmpty")}</p>}
        {(verifiedRegistration || verifiedInvitation) && (
          <p className="flex items-center gap-2 rounded-lg bg-event-display-tint p-3 text-theme-sm font-semibold">
            <CheckCircleIcon className="size-5 shrink-0" aria-hidden="true" />{t(verifiedRegistration ? "registrationVerified" : "invitationVerified")}
          </p>
        )}
        {form.questions.map(({ question }, index) => {
          const id = publicQuestionId(question);
          const card = (
            <PreviewQuestionCard
              key={id}
              appearance="participant"
              number={kind === "survey" ? index + 1 : undefined}
              question={{
                ...question,
                id: readOnly ? `${instanceId}-${id}` : id,
                is_unique: false,
              }}
              locale={locale}
              answer={answers[id]}
              errorMessage={formatIssue(errors[id])}
              onChangeAnswer={(answer) => updateAnswer(id, answer)}
              onToggleCheckbox={(choiceId) => toggleCheckbox(id, choiceId)}
              onClearAnswer={() => updateAnswer(id, "")}
            />
          );
          return id === verifiedId ? <fieldset key={id} disabled className="min-w-0">{card}</fieldset> : card;
        })}
        {draft.storageError && <p role="alert" className="text-theme-sm text-error-700">{t("draftStorageError")}</p>}
        {submitError && (
          <p role="alert" className="flex items-start gap-3 rounded-lg bg-error-50 px-4 py-3 text-theme-sm text-error-700">
            <InformationCircleIcon aria-hidden="true" className="size-5 shrink-0" />{t(submitError)}
          </p>
        )}
        <Button
          type={readOnly ? "button" : "submit"}
          disabled={cannotSubmit}
          className="min-h-12 w-full bg-(--participant-accent)! text-(--participant-on-accent)! enabled:hover:brightness-95"
        >
          {t(submitting ? "submitting" : kind === "registration" ? "submitRegistration" : "submitSurvey")}
        </Button>
        {!readOnly && Object.keys(answers).some((id) => id !== verifiedId) && (
          <button
            type="button"
            disabled={submitting}
            onClick={() => {
              if (draftScope) drafts.write(draftScope, {});
              setErrors({});
              setSubmitError(null);
            }}
            className="self-end rounded-lg px-3 py-2 text-theme-sm font-medium text-(--participant-control-text) hover:underline"
          >
            {preview("clearForm")}
          </button>
        )}
      </fieldset>
    ) : null;

  const statusLink = "inline-flex min-h-11 items-center justify-center rounded-xl bg-(--participant-accent) px-5 font-semibold text-(--participant-on-accent) hover:brightness-95";
  return (
    <>
    <ParticipantFormLayout
      details={eventDetails}
      branding={branding}
      bannerUrl={bannerUrl}
      kind={kind}
      languages={languages}
      locale={contentLocale || portalLocale}
      showMobileFooter={kind === "registration" && !eventDetails.isPrivate && Boolean(form)}
      readOnly={readOnly}
      fillViewport={fillViewport}
      eventHref={eventHref}
    >
      {fields ? (
        readOnly ? fields : <form onSubmit={submit} noValidate>{fields}</form>
      ) : current.status === "eligibility" && checkEligibility ? (
        <ParticipantEligibilityGate
          gate={current}
          locale={preferredLocale}
          accessChanged={accessChanged}
          verify={checkEligibility}
          onResult={receiveEligibility}
        />
      ) : (
        <div className="space-y-4">
          <h1 className="text-2xl leading-snug font-bold">{heading}</h1>
          <div role="status" className="flex items-start gap-3 rounded-xl bg-event-display-tint p-4 text-theme-sm font-medium">
            {status === "submitted" ? <CheckCircleIcon className="size-5 shrink-0" aria-hidden="true" /> : <InformationCircleIcon className="size-5 shrink-0" aria-hidden="true" />}
            <div className="space-y-2">
              <p>{t(
                status === "submitted"
                  ? kind === "registration" ? "registrationSubmitted" : "surveySubmitted"
                  : status === "eligibility" ? "restricted" : status === "open" ? "unavailable" : status,
              )}</p>
              {current.status === "submitted" && cleanupFailed && <p role="alert">{t("draftCleanupError")}</p>}
              {current.status === "submitted" && current.earlierAnswers && <p>{t("earlierAnswersSaved")}</p>}
            </div>
          </div>
          {status === "full" && eventHref && (
            <Link id={`${instanceId}-return`} href={eventHref} className={statusLink}>{t("backToEvent")}</Link>
          )}
          {status === "registrationRequired" && registrationHref && (
            <Link href={registrationHref} className={statusLink}>{t("goToRegistration")}</Link>
          )}
          {status === "previewEmpty" && (
            <Button type="button" disabled className="min-h-12 w-full bg-(--participant-accent)! text-(--participant-on-accent)!">
              {t(kind === "registration" ? "submitRegistration" : "submitSurvey")}
            </Button>
          )}
          {status === "submitted" && kind === "registration" && surveyHref && (
            <Link href={surveyHref} prefetch={false} className={statusLink}>{t("goToSurvey")}</Link>
          )}
        </div>
      )}
    </ParticipantFormLayout>
    {status === "full" && eventHref && (
      <ParticipantCapacityDialog kind={kind} eventHref={eventHref} accent={branding.accent} returnId={`${instanceId}-return`} />
    )}
    </>
  );
}
