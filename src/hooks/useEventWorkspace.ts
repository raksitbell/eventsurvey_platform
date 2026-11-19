"use client";

import { useAuth } from "@/context/AuthContext";
import { api } from "@/core/api";
import { eventSetupStateKey, subscribeToEventSetup } from "@/core/event/local-events";
import { applyEventSetup } from "@/core/event/workspace";
import type { EventWorkspace } from "@/types/event/workspace";
import { useLocale } from "next-intl";
import { useEffect, useState } from "react";

export default function useEventWorkspace() {
  const { user } = useAuth();
  const locale = useLocale();
  const [attempt, setAttempt] = useState(0);
  const identity = `${user?.id ?? ""}:${locale}:${attempt}`;
  const [result, setResult] = useState<{
    workspace: EventWorkspace | null;
    error: boolean;
    identity: string;
  }>({ workspace: null, error: false, identity: "" });
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    let unsubscribe: (() => void) | undefined;
    let subscribedEvent: string | undefined;
    let sequence = 0;
    const controller = new AbortController();
    const refresh = () => {
      const current = ++sequence;
      void api.get<EventWorkspace | null>(
        `/event/workspace?locale=${encodeURIComponent(locale)}`,
        controller.signal,
      ).then((workspace) => {
        if (controller.signal.aborted || current !== sequence) return;
        if (workspace?.eventId !== subscribedEvent) {
          unsubscribe?.();
          subscribedEvent = workspace?.eventId;
          unsubscribe = subscribedEvent
            ? subscribeToEventSetup([eventSetupStateKey(subscribedEvent)], refresh)
            : undefined;
        }
        setResult({
          workspace: workspace ? applyEventSetup(workspace, locale) : null,
          error: false,
          identity,
        });
      }).catch(() => {
        if (controller.signal.aborted || current !== sequence) return;
        // A failed background refresh must not discard an open page's unsaved input.
        setResult((previous) => previous.identity === identity && previous.workspace
          ? previous : { workspace: null, error: true, identity });
      });
    };
    refresh();
    globalThis.window.addEventListener("focus", refresh);
    return () => {
      unsubscribe?.();
      globalThis.window.removeEventListener("focus", refresh);
      controller.abort();
    };
  }, [identity, locale, userId]);
  return {
    workspace: result.workspace,
    error: result.error,
    loading: result.identity !== identity,
    retry: () => setAttempt((value) => value + 1),
    identity: `${identity}:${result.workspace?.eventId ?? ""}`,
    userId,
    locale,
  };
}
