"use client";
import { api } from "@/core/api";
import type { FormRecord, FormListResponse, RestrictedFormReview } from "@/types/event/form";
import { useEffect, useState } from "react";

/** Read existing BFF form metadata; the Raksit wizard never edits form definitions. */
export default function useEventFormSummaries(eventId: string, needed = true, publishReview = false) {
  const [attempt, setAttempt] = useState(0);
  const identity = `${eventId}:${publishReview}:${attempt}`;
  const [result, setResult] = useState<{
    identity: string;
    forms: FormRecord[];
    restrictedForms?: RestrictedFormReview;
    unreviewable?: { registration: boolean; survey: boolean };
    error: boolean;
  }>({ identity: "", forms: [], error: false });
  useEffect(() => {
    if (!needed) return;
    let active = true;
    const controller = new AbortController();
    const timeout = globalThis.setTimeout(() => controller.abort(), 10000);
    api
      .get<FormListResponse>(
        `/event/forms?eventId=${encodeURIComponent(eventId)}${publishReview ? "&publishReview=1" : ""}`,
        controller.signal,
      )
      .then(({ forms, eventId: returnedId, restrictedForms, registrationFormAccess, surveyFormAccess }) => {
        if (returnedId !== eventId || !Array.isArray(forms))
          throw new Error("Invalid form summary response");
        if (active) setResult({
          identity, forms, restrictedForms, error: false,
          unreviewable: {
            registration: registrationFormAccess === "restricted" && !restrictedForms?.registration,
            survey: surveyFormAccess === "restricted" && !restrictedForms?.survey,
          },
        });
      })
      .catch(() => {
        if (active) setResult({ identity, forms: [], error: true });
      })
      .finally(() => {
        globalThis.clearTimeout(timeout);
      });
    return () => {
      active = false;
      globalThis.clearTimeout(timeout);
      controller.abort();
    };
  }, [eventId, identity, needed, publishReview]);
  return {
    forms: needed && result.identity === identity ? result.forms : [],
    restrictedForms: needed && result.identity === identity ? result.restrictedForms : undefined,
    unreviewable: needed && result.identity === identity ? result.unreviewable : undefined,
    error: needed && result.identity === identity && result.error,
    loading: needed && result.identity !== identity,
    retry: () => setAttempt((value) => value + 1),
  };
}
