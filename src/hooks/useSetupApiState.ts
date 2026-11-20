"use client";

import { useRef, useState } from "react";
import { api, ApiError } from "@/core/api";
import {
  eventSetupStateKey,
  notifyEventSetupSaved,
} from "@/core/event/local-events";
import type { EventBranding } from "@/types/event/branding";
import type {
  EventDraft,
  EventSetupMediaKind,
  EventSetupState,
} from "@/types/event/setup";
import type { EventWorkspace } from "@/types/event/workspace";

interface SetupDraftChange {
  draft?: EventDraft;
  branding?: {
    locale: string;
    value: EventBranding;
    pendingMedia: EventSetupMediaKind[];
  };
}

export default function useSetupApiState(workspace: EventWorkspace) {
  const acknowledgedRevision = useRef(workspace.setup?.revision ?? 0);
  const ownRevisions = useRef(new Map<number, number>());
  const writing = useRef(false);
  const [pending, setPending] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const getRevision = () =>
    Math.max(acknowledgedRevision.current, workspace.setup?.revision ?? 0);

  function revisionForWrite(base: number) {
    let revision = base;
    let next = ownRevisions.current.get(revision);
    while (next !== undefined) {
      revision = next;
      next = ownRevisions.current.get(revision);
    }
    return revision;
  }

  async function save(change: SetupDraftChange, revisionAtEdit?: number) {
    if (writing.current) return null;
    writing.current = true;
    setPending(true);
    setErrorCode(null);
    try {
      const revision = revisionForWrite(revisionAtEdit ?? getRevision());
      const saved = await api.patch<EventSetupState & { savedFromRevision?: number }>("/event/setup/draft", {
        eventId: workspace.eventId,
        revision,
        ...change,
      });
      if (saved.savedFromRevision === revision && saved.revision === revision + 1) {
        ownRevisions.current.set(revision, saved.revision);
      }
      acknowledgedRevision.current = Math.max(
        acknowledgedRevision.current,
        saved.revision,
      );
      notifyEventSetupSaved(eventSetupStateKey(workspace.eventId));
      return saved;
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorCode(error.code ?? null);
      }
      return null;
    } finally {
      writing.current = false;
      setPending(false);
    }
  }

  return { save, getRevision, pending, conflict: errorCode === "SETUP_CONFLICT", errorCode };
}

export type SetupDraftApi = ReturnType<typeof useSetupApiState>;
