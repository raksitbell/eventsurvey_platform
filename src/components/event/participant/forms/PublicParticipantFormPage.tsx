import { hasLocale } from "next-intl";
import { getLocale } from "next-intl/server";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { z } from "zod";
import PublicParticipantForm from "./PublicParticipantForm";
import { publicEventPath } from "@/core/event/public-event-paths";
import {
  issueRegistrationCookie,
  readRegistrationProof,
  registrationCookieName,
  submissionRequestKey,
} from "@/core/event/registration-receipt";
import { routing } from "@/i18n/routing";
import { recoverPublicSubmission, submitPublicForm } from "@/services/event/participant-submissions";
import { getPublicFormBySlug, getPublicFormPageBySlug } from "@/services/event/public-event";
import type { ParticipantFormKind } from "@/types/event/participant";
import type { PublicFormSubmissionResult } from "@/types/event/public-event";

interface PublicParticipantFormPageProps {
  eventSlug: string;
  kind: ParticipantFormKind;
}

async function currentRegistration(slug: string) {
  const jar = await cookies();
  return readRegistrationProof(slug, jar.get(registrationCookieName(slug))?.value);
}

async function acknowledgeSubmission(slug: string, result: Awaited<ReturnType<typeof submitPublicForm>>): Promise<PublicFormSubmissionResult> {
  if (result.status !== "submitted") return result;
  if (result.registration) {
    const jar = await cookies();
    jar.set(issueRegistrationCookie(slug, result.registration, result.receiptExpiresAt));
  }
  return { status: "submitted" };
}

export default async function PublicParticipantFormPage({
  eventSlug,
  kind,
}: PublicParticipantFormPageProps) {
  const locale = await getLocale();
  if (!hasLocale(routing.locales, locale)) notFound();
  const page = await getPublicFormPageBySlug(eventSlug, kind, locale, await currentRegistration(eventSlug));
  if (!page) notFound();

  async function checkEligibility(data: FormData) {
    "use server";
    const identifier = data instanceof FormData ? data.get("identifier") : null;
    const proof = await currentRegistration(eventSlug);
    return await getPublicFormBySlug(eventSlug, kind, identifier, proof) ?? { status: "unavailable" as const };
  }

  async function submitResponse(data: FormData): Promise<PublicFormSubmissionResult> {
    "use server";
    const invalid = { status: "invalid", errors: {} } as const;
    if (!(data instanceof FormData)) return invalid;
    const requestId = z.uuidv4().safeParse(data.get("requestId"));
    const formLocale = data.get("locale");
    const identifier = data.get("identifier");
    const raw = data.get("answers");
    if (!requestId.success || (formLocale !== "th" && formLocale !== "en") || typeof raw !== "string" ||
      (identifier !== null && (typeof identifier !== "string" || identifier.length > 500))) return invalid;
    let answers: unknown;
    try {
      answers = JSON.parse(raw);
    } catch {
      return invalid;
    }
    const result = await submitPublicForm(eventSlug, kind, {
      requestId: submissionRequestKey(eventSlug, kind, requestId.data),
      answers,
      locale: formLocale,
      identifier: identifier ?? undefined,
    }, await currentRegistration(eventSlug));
    return acknowledgeSubmission(eventSlug, result);
  }

  async function recoverSubmission(requestId: string): Promise<boolean> {
    "use server";
    const parsed = z.uuidv4().safeParse(requestId);
    if (!parsed.success) return false;
    const result = await recoverPublicSubmission(eventSlug, kind, submissionRequestKey(eventSlug, kind, parsed.data));
    if (!result || result.status !== "submitted") return false;
    await acknowledgeSubmission(eventSlug, result);
    return true;
  }

  return (
    <PublicParticipantForm
      key={publicEventPath(eventSlug, kind)}
      kind={kind}
      eventHref={publicEventPath(eventSlug)}
      result={page.result}
      branding={page.branding}
      bannerUrl={page.bannerUrl}
      registrationHref={kind === "survey" ? publicEventPath(eventSlug, "registration") : undefined}
      surveyHref={kind === "registration" && page.hasSurvey ? publicEventPath(eventSlug, "survey") : undefined}
      submitResponse={submitResponse}
      recoverSubmission={recoverSubmission}
      checkEligibility={checkEligibility}
    />
  );
}
