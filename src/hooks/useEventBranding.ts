"use client";

import { useRef, useState } from "react";
import { defaultEventBranding, eventBrandingEditSchema } from "@/core/event/branding";
import {
  applySetupLocalMedia,
  clearUnneededSetupLocalMedia,
  prepareSetupBranding,
  setupLocalMediaKey,
} from "@/core/event/setup-media-local";
import useSetupApiState, { type SetupDraftApi } from "@/hooks/useSetupApiState";
import type { EventBranding } from "@/types/event/branding";
import type { DraftSaveStatus, EventSetupMediaKind } from "@/types/event/setup";
import type { EventWorkspace } from "@/types/event/workspace";
import { ImageUploadError } from "@/utils/image-upload";

interface BrandingEdit {
  value: EventBranding;
  revision: number;
  explicitMedia: Set<EventSetupMediaKind>;
}

interface SavedBranding {
  value: EventBranding;
  revision: number;
  pendingMedia: EventSetupMediaKind[];
}

const mediaKinds = ["logo", "wordmark", "banner"] as const;

export default function useEventBranding(
  workspace: EventWorkspace,
  userId: string,
  locale: string,
  sharedApi?: SetupDraftApi,
) {
  const ownApi = useSetupApiState(workspace);
  const api = sharedApi ?? ownApi;
  const setup = workspace.setup;
  const readOnly = !workspace.canEditEvent || !!setup?.publication;
  const key = setupLocalMediaKey(userId, workspace.eventId, locale);
  const [edit, setEdit] = useState<BrandingEdit | null>(null);
  const [acknowledged, setAcknowledged] = useState<SavedBranding | null>(null);
  const [status, setStatus] = useState<DraftSaveStatus | "idle">("idle");
  const [mediaSaveError, setMediaSaveError] = useState<
    "fileOutputSize" | "fileStorage" | undefined
  >();
  const [saving, setSaving] = useState(false);
  const inFlight = useRef<Promise<boolean> | null>(null);
  const ownSaved =
    acknowledged && acknowledged.revision > (setup?.revision ?? 0)
      ? acknowledged
      : null;
  const stored = ownSaved?.value ?? setup?.branding[locale] ?? defaultEventBranding;
  const pendingMedia = ownSaved?.pendingMedia ?? setup?.pendingMedia[locale] ?? [];
  const branding = setup?.publication
    ? setup.publishedBranding?.[locale] ?? setup.publication.branding
    : readOnly ? stored : edit?.value ?? applySetupLocalMedia(stored, key, pendingMedia);

  function change(changes: Partial<EventBranding>) {
    if (readOnly) return false;
    const next = eventBrandingEditSchema.safeParse({ ...branding, ...changes });
    if (!next.success) {
      setStatus("invalid");
      return false;
    }
    setEdit({
      value: next.data,
      revision: edit?.revision ?? api.getRevision(),
      explicitMedia: new Set([
        ...(edit?.explicitMedia ?? []),
        ...mediaKinds.filter((kind) => {
          if (!Object.hasOwn(changes, kind)) return false;
          const previous = branding[kind];
          const current = changes[kind];
          return (
            previous?.name !== current?.name ||
            previous?.url !== current?.url ||
            (kind === "banner" && branding.banner?.cropPosition !== changes.banner?.cropPosition) ||
            (previous === null) !== (current === null)
          );
        }),
      ]),
    });
    setStatus("idle");
    setMediaSaveError(undefined);
    return true;
  }

  function discardPendingMedia(kind: EventSetupMediaKind) {
    if (readOnly || !pendingMedia.includes(kind)) return;
    const revision = api.getRevision();
    setEdit((current) => ({
      revision: current?.revision ?? revision,
      value: { ...(current?.value ?? branding), [kind]: stored[kind] ?? null },
      explicitMedia: new Set([...(current?.explicitMedia ?? []), kind]),
    }));
    setStatus("idle");
    setMediaSaveError(undefined);
  }

  async function persist() {
    try {
      const next = await prepareSetupBranding(
        branding,
        stored,
        pendingMedia,
        edit?.explicitMedia ?? new Set(),
        key,
        workspace.eventId,
      );
      const result = await api.save({ branding: { locale, ...next } }, edit?.revision);
      if (!result) {
        setStatus("error");
        return false;
      }
      const acceptedPending = result.pendingMedia[locale] ?? [];
      setAcknowledged({
        value: result.branding[locale] ?? defaultEventBranding,
        pendingMedia: acceptedPending,
        revision: result.revision,
      });
      clearUnneededSetupLocalMedia(key, acceptedPending);
      setEdit((current) => (current === edit ? null : current));
      setStatus("saved");
      return true;
    } catch (error) {
      if (
        error instanceof ImageUploadError &&
        (error.code === "fileOutputSize" || error.code === "fileStorage")
      ) {
        setMediaSaveError(error.code);
      }
      setStatus("error");
      return false;
    } finally {
      inFlight.current = null;
      setSaving(false);
    }
  }

  function save() {
    if (
      readOnly ||
      (!edit && !pendingMedia.some((kind) => branding[kind]?.url.startsWith("data:")))
    ) return true;
    if (inFlight.current) return inFlight.current;
    setMediaSaveError(undefined);
    setSaving(true);
    inFlight.current = persist();
    return inFlight.current;
  }

  const pending = pendingMedia.filter((kind) =>
    !edit?.explicitMedia.has(kind) || branding[kind]?.url.startsWith("data:"),
  );
  const pendingMediaMessage = pending.some((kind) =>
    branding[kind]?.url.startsWith("data:image/svg+xml;base64,"),
  )
    ? "mediaSvgLocalOnly"
    : pending.every((kind) => branding[kind]?.url.startsWith("data:"))
      ? "mediaLocalOnly"
      : "mediaAnotherBrowser";

  return {
    branding,
    status,
    mediaSaveError,
    readOnly,
    change,
    save,
    pendingMedia: pending,
    pendingMediaMessage: pending.length ? pendingMediaMessage : undefined,
    discardPendingMedia,
    saving,
    dirty: !readOnly && !!edit,
  };
}
