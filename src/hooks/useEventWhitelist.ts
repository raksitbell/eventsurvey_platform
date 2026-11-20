"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/core/api/client";
import {
  eventSetupStateKey,
  notifyEventSetupSaved,
} from "@/core/event/local-events";
import {
  canEditWhitelist,
  mergeLegacyWhitelist,
  readLegacyWhitelists,
  removeVerifiedLegacyWhitelists,
} from "@/core/event/whitelist";
import type {
  WhitelistEntry,
  WhitelistResponse,
} from "@/types/event/whitelist";
import type { EventWorkspace } from "@/types/event/workspace";

type WhitelistError = "loadError" | "storageError" | "conflict";

export default function useEventWhitelist(
  workspace: EventWorkspace,
  userId: string,
  locale: string,
) {
  const [server, setServer] = useState<WhitelistResponse | null>(null);
  const [entries, setEntries] = useState<WhitelistEntry[]>([]);
  const [error, setError] = useState<WhitelistError | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [legacy, setLegacy] = useState(() =>
    readLegacyWhitelists(userId, workspace.eventId),
  );
  const [recovering, setRecovering] = useState(false);
  const permitted = workspace.canManageWhitelist;
  const params = new URLSearchParams({ locale, eventId: workspace.eventId });
  const endpoint = `/event/setup/whitelist?${params}`;

  useEffect(() => {
    if (!permitted) return;
    const controller = new AbortController();
    void api
      .get<WhitelistResponse>(endpoint, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setServer(result);
        setEntries(result.entries);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError("loadError");
      });
    return () => controller.abort();
  }, [attempt, endpoint, permitted, workspace.eventId]);

  const uniqueField = permitted ? (server?.uniqueField ?? null) : null;
  const readOnly =
    !canEditWhitelist(workspace) || !uniqueField || error === "conflict";
  const recovery =
    uniqueField && legacy.length
      ? mergeLegacyWhitelist(entries, legacy, uniqueField)
      : null;
  const restore = () => {
    if (readOnly || !recovery?.matches) return;
    setEntries(recovery.entries);
    setRecovering(true);
  };
  const change = (next: WhitelistEntry[]) => {
    if (!readOnly) setEntries(next);
  };
  const save = async () => {
    if (readOnly || !server) return false;
    try {
      const result = await api.patch<WhitelistResponse>(endpoint, {
        eventId: workspace.eventId,
        revision: server.revision,
        entries,
      });
      setServer(result);
      setEntries(result.entries);
      setError(null);
      notifyEventSetupSaved(eventSetupStateKey(workspace.eventId));
      if (recovering && uniqueField) {
        try {
          const verified = await api.get<WhitelistResponse>(endpoint);
          if (
            verified.revision === result.revision &&
            verified.uniqueField?.id === uniqueField.id
          ) {
            removeVerifiedLegacyWhitelists(
              verified.entries,
              legacy,
              uniqueField,
            );
          }
        } catch {
          // The browser source is retained when the saved list cannot be verified.
        }
        setLegacy(readLegacyWhitelists(userId, workspace.eventId));
        setRecovering(false);
      }
      return true;
    } catch (failure) {
      setError(
        failure instanceof ApiError && failure.status === 409
          ? "conflict"
          : "storageError",
      );
      return false;
    }
  };
  const reload = () => {
    setServer(null);
    setError(null);
    setRecovering(false);
    setAttempt((current) => current + 1);
  };
  return {
    entries: permitted ? entries : [],
    change,
    save,
    reload,
    recovery,
    recovering,
    restore,
    readOnly,
    error,
    loading: permitted && !server && !error,
    uniqueField,
    missingUniqueField: permitted && !!server && !uniqueField,
    dirty:
      !!server && JSON.stringify(entries) !== JSON.stringify(server.entries),
  };
}
