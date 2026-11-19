"use client";

import Button from "@/components/ui/button/Button";
import { api, ApiError } from "@/core/api";
import {
  defaultEventBranding,
  eventBrandingKey,
  eventBrandingSchema,
} from "@/core/event/branding";
import {
  eventDraftKey,
  eventDraftSchema,
  eventDraftV2Key,
  legacyEventSetupLocales,
  restoreEventDraft,
} from "@/core/event/draft";
import { eventSetupStateKey, notifyEventSetupSaved } from "@/core/event/local-events";
import { loadEventPublication } from "@/core/event/publication";
import { prepareSetupBranding, setupLocalMediaKey } from "@/core/event/setup-media-local";
import type { EventSetupState } from "@/types/event/setup";
import type { EventSetupPageProps } from "./EventSetupBoundary";
import { useTranslations } from "next-intl";
import { useState } from "react";

function browserValue(key: string) {
  try {
    return globalThis.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function recoverableDraftKey(key: string): [string, string][] {
  const raw = browserValue(key);
  if (!raw) return [];
  try {
    return eventDraftSchema.safeParse(JSON.parse(raw)).success ? [[key, raw]] : [];
  } catch {
    return [];
  }
}

function recoverableSetup({ workspace, userId, locale }: EventSetupPageProps) {
  const eventId = workspace.eventId;
  const restored = restoreEventDraft(workspace, userId, locale);
  const archive = loadEventPublication(userId, eventId, locale, !!workspace.content);
  const oldPublication = archive?.publishedAt !== workspace.setup?.recoveredPublicationAt ? archive : null;
  const draft = restored.hasLocalDraft ? eventDraftSchema.parse(restored) : oldPublication?.draft;
  const keys: Array<[string, string | null]> = [
    eventDraftV2Key(userId, eventId),
    ...legacyEventSetupLocales.map((language) => eventDraftKey(userId, eventId, language)),
  ].flatMap(recoverableDraftKey);
  const branding = legacyEventSetupLocales.flatMap((language) => {
    const key = eventBrandingKey(userId, eventId, language);
    const raw = browserValue(key);
    if (!raw) return [];
    try {
      const parsed = eventBrandingSchema.safeParse(JSON.parse(raw));
      if (!parsed.success) return [];
      keys.push([key, raw]);
      return [{ locale: language as string, value: parsed.data }];
    } catch {
      return [];
    }
  });
  if (!branding.length && oldPublication) branding.push({ locale, value: oldPublication.branding });
  return { draft, branding, oldPublication, keys };
}

export default function EventSetupRecovery(props: EventSetupPageProps) {
  const t = useTranslations("eventSetup");
  const { workspace, userId } = props;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<"recoveryError" | "draftConflict" | null>(null);
  const [confirmedRevision, setConfirmedRevision] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const setup = workspace.setup;
  if (!setup || setup.publication || !workspace.canEditEvent || dismissed) return null;
  const candidates = recoverableSetup(props);
  if (!candidates.draft && !candidates.branding.length && !candidates.oldPublication) return null;
  const replace = setup.revision > 0;
  const confirmed = confirmedRevision === setup.revision;

  async function recover() {
    if (!setup || pending || (replace && !confirmed)) return;
    setPending(true);
    setError(null);
    try {
      const branding = await Promise.all(candidates.branding.map(async ({ locale, value }) => ({
        locale,
        ...await prepareSetupBranding(
          value,
          setup.branding[locale] ?? defaultEventBranding,
          setup.pendingMedia[locale] ?? [],
          new Set(),
          setupLocalMediaKey(userId, workspace.eventId, locale),
          workspace.eventId,
        ),
      })));
      const archive = candidates.oldPublication;
      const oldPublication = archive ? {
        ...archive,
        branding: { ...archive.branding, logo: null, banner: null, wordmark: null },
      } : undefined;
      const reply = await api.post<EventSetupState>("/event/setup/recover", {
        eventId: workspace.eventId,
        revision: setup.revision,
        replace,
        draft: candidates.draft,
        branding,
        oldPublication,
      });
      const verified = await api.get<EventSetupState>(
        `/event/setup/draft?eventId=${encodeURIComponent(workspace.eventId)}`,
      );
      if (reply.revision !== verified.revision || JSON.stringify(reply) !== JSON.stringify(verified))
        throw new Error("Recovery could not be verified");
      for (const [key, original] of candidates.keys) {
        if (original && browserValue(key) === original) {
          try {
            globalThis.localStorage.removeItem(key);
          } catch {
            // The restored API data remains safe even when browser cleanup fails.
          }
        }
      }
      setDismissed(true);
      notifyEventSetupSaved(eventSetupStateKey(workspace.eventId));
    } catch (cause) {
      setError(cause instanceof ApiError && cause.status === 409 ? "draftConflict" : "recoveryError");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="my-3 space-y-2" aria-label={t("recoverDraft")}>
      <p role="status">{t(replace ? "recoveryConflict" : "recoveryFound")}</p>
      {replace && (
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={confirmed} onChange={(event) => {
            setConfirmedRevision(event.target.checked ? setup.revision : null);
          }} />
          {t("recoveryReplace")}
        </label>
      )}
      <div className="flex gap-2">
        <Button variant="outline" disabled={pending || (replace && !confirmed)} onClick={() => void recover()}>
          {t("recoverDraft")}
        </Button>
        <Button variant="outline" disabled={pending} onClick={() => setDismissed(true)}>
          {t("recoveryKeep")}
        </Button>
      </div>
      {error && <p role="alert" className="text-error-700 dark:text-error-300">{t(error)}</p>}
    </section>
  );
}
