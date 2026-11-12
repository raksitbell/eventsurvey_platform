"use client";
import { api } from "@/core/api";
import type { FormRecord } from "@/types/event/form";
import { useEffect, useState } from "react";

/** Read existing BFF form metadata; the Raksit wizard never edits form definitions. */
export default function useEventFormSummaries(eventId: string, needed = true) {
  const [attempt, setAttempt] = useState(0);
  const identity = `${eventId}:${attempt}`;
  const [result, setResult] = useState<{
    identity: string;
    forms: FormRecord[];
    error: boolean;
  }>({ identity: "", forms: [], error: false });
  useEffect(() => {
    if (!needed) return;
    let active = true;
    const controller = new AbortController();
    const timeout = globalThis.setTimeout(() => controller.abort(), 10000);
    api
      .get<FormRecord[]>(
        `/event/forms?eventId=${encodeURIComponent(eventId)}`,
        { signal: controller.signal },
      )
      .then((forms) => {
        if (!Array.isArray(forms))
          throw new Error("Invalid form summary response");
        if (active) setResult({ identity, forms, error: false });
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
  }, [eventId, identity, needed]);
  return {
    forms: needed && result.identity === identity ? result.forms : [],
    error: needed && result.identity === identity && result.error,
    loading: needed && result.identity !== identity,
    retry: () => setAttempt((value) => value + 1),
  };
}
