"use client";

import { useAuth } from "@/context/AuthContext";
import { api } from "@/core/api";
import { eventSetupStateKey, subscribeToEventSetup } from "@/core/event/local-events";
import { applyEventSetup } from "@/core/event/workspace";
import {
  readWorkspaceCache,
  writeWorkspaceCache,
} from "@/core/event/workspace-cache";
import type { EventWorkspace } from "@/types/event/workspace";
import { useLocale } from "next-intl";
import { useEffect, useState } from "react";

function cachedResult(userId: string, locale: string, identity: string) {
  const cached = readWorkspaceCache(userId, locale);
  if (cached === undefined) {
    return { workspace: null as EventWorkspace | null, error: false, identity: "" };
  }
  return {
    workspace: cached ? applyEventSetup(cached, locale) : null,
    error: false,
    identity,
  };
}

export default function useEventWorkspace() {
  const { user } = useAuth();
  const locale = useLocale();
  const [attempt, setAttempt] = useState(0);
  const userId = user?.id;
  const identity = `${userId ?? ""}:${locale}:${attempt}`;
  const [result, setResult] = useState<{
    workspace: EventWorkspace | null;
    error: boolean;
    identity: string;
  }>(() =>
    userId
      ? cachedResult(userId, locale, `${userId}:${locale}:0`)
      : { workspace: null, error: false, identity: "" },
  );

  useEffect(() => {
    if (!userId) return;

    const seeded = cachedResult(userId, locale, identity);
    if (seeded.identity) {
      setResult(seeded);
    }

    let unsubscribe: (() => void) | undefined;
    let subscribedEvent: string | undefined;
    let sequence = 0;
    const controller = new AbortController();
    const refresh = () => {
      const current = ++sequence;
      void api
        .get<EventWorkspace | null>(
          `/event/workspace?locale=${encodeURIComponent(locale)}`,
          controller.signal,
        )
        .then((workspace) => {
          if (controller.signal.aborted || current !== sequence) return;
          if (workspace?.eventId !== subscribedEvent) {
            unsubscribe?.();
            subscribedEvent = workspace?.eventId;
            unsubscribe = subscribedEvent
              ? subscribeToEventSetup(
                  [eventSetupStateKey(subscribedEvent)],
                  refresh,
                )
              : undefined;
          }
          const next = workspace ? applyEventSetup(workspace, locale) : null;
          writeWorkspaceCache(userId, locale, next);
          setResult({ workspace: next, error: false, identity });
        })
        .catch(() => {
          if (controller.signal.aborted || current !== sequence) return;
          // A failed background refresh must not discard an open page's unsaved input.
          setResult((previous) =>
            previous.identity === identity && previous.workspace
              ? previous
              : { workspace: null, error: true, identity },
          );
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
