"use client";

import { useAuth } from "@/context/AuthContext";
import { api } from "@/core/api";
import { publicationKey } from "@/core/event/publication";
import { eventDraftKey } from "@/core/event/draft";
import { subscribeToEventSetup } from "@/core/event/local-events";
import { restoreLocalEventWorkspace } from "@/core/event/workspace";
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
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    const controller = new AbortController();
    api
      .get<EventWorkspace | null>(
        `/event/workspace?locale=${encodeURIComponent(locale)}`,
        { signal: controller.signal },
      )
      .then((workspace) => {
        if (cancelled) return;
        const refreshLocalSetup = () => {
          setResult({
            workspace: workspace
              ? restoreLocalEventWorkspace(workspace, userId, locale)
              : null,
            error: false,
            identity,
          });
        };
        if (workspace)
          unsubscribe = subscribeToEventSetup(
            [
              eventDraftKey(userId, workspace.eventId, locale),
              publicationKey(userId, workspace.eventId, locale),
            ],
            refreshLocalSetup,
          );
        refreshLocalSetup();
      })
      .catch(() => {
        if (!cancelled) setResult({ workspace: null, error: true, identity });
      });
    return () => {
      cancelled = true;
      unsubscribe?.();
      controller.abort();
    };
  }, [identity, locale, userId]);
  return {
    workspace: result.workspace,
    error: result.error,
    loading: result.identity !== identity,
    retry: () => setAttempt((value) => value + 1),
    identity,
    userId,
    locale,
  };
}
