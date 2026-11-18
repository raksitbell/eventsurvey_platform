import { z } from "zod";
import { normalizeEventAccess } from "@/core/event/access";
import {
  eventContentSchema,
  getEventContent,
  projectEventContent,
  resolveEventTranslation,
} from "@/core/event/content";
import { notifyEventSetupSaved } from "@/core/event/local-events";
import type {
  EventContent,
  EventContentTranslation,
} from "@/types/event/content";
import type { EventDraft, DraftSaveStatus } from "@/types/event/setup";
import type { EventWorkspace } from "@/types/event/workspace";

/** Create a navigation action that proceeds only after a successful synchronous local save. */
export function createSavedNavigation<Path extends string>(
  save: () => boolean,
  navigate: (href: Path) => void,
) {
  return (href: Path) => {
    if (save()) navigate(href);
  };
}

export const eventDraftSchema = z
  .object({
    eventName: z.string().max(255),
    description: z.string().max(5000).nullable(),
    locationName: z.string().max(500).nullable(),
    content: eventContentSchema.optional(),
    // Zod v4: z.string().datetime() is deprecated; use z.iso.datetime() instead.
    startsAt: z.iso.datetime({ offset: true }).nullable(),
    endsAt: z.iso.datetime({ offset: true }).nullable(),
    locationDetail: z.string().max(500).optional(),
    alternateContent: z
      .object({
        eventName: z.string().max(255),
        description: z.string().max(5000),
        locationName: z.string().max(500),
        locationDetail: z.string().max(500),
      })
      .optional(),
    surveyCloseMode: z
      .enum(["event", "week", "fortnight", "custom"])
      .optional(),
    surveyCustomClose: z.iso.datetime({ offset: true }).nullable().optional(),
    isPrivate: z.boolean(),
    hasRegistration: z.boolean(),
    hasSurvey: z.boolean(),
    registrationCapacity: z.number().int().positive().nullable().optional(),
    surveyCapacity: z.number().int().positive().nullable().optional(),
    surveyAccess: z.enum(["public", "registered_only"]).nullable(),
  })
  .transform(normalizeEventAccess);

export function eventDraftKey(userId: string, eventId: string, locale: string) {
  return `eventsurvey:event-draft:v1:${userId}:${eventId}:${locale}`;
}

export const legacyEventSetupLocales = ["th", "en"] as const;

export function eventDraftV2Key(userId: string, eventId: string) {
  return `eventsurvey:event-draft:v2:${encodeURIComponent(userId)}:${encodeURIComponent(eventId)}`;
}

/** Frontend demo edits remain local, including owner previews of published events. */
export function canEditLocalEventSetup(workspace: EventWorkspace): boolean {
  if (workspace.localPublishedAt) return false;
  return workspace.eventStatus === "draft"
    ? workspace.canEditEvent
    : workspace.userRole === "event_owner";
}

function sameText(a: EventContentTranslation, b: EventContentTranslation) {
  return (
    a.title === b.title &&
    (a.description ?? "") === (b.description ?? "") &&
    (a.locationName ?? "") === (b.locationName ?? "") &&
    (a.floorZone ?? "") === (b.floorZone ?? "")
  );
}

export function legacyDraftContent(
  draft: EventDraft,
  locale: (typeof legacyEventSetupLocales)[number],
): EventContent {
  if (draft.content) return draft.content;
  const content = getEventContent(draft, locale);
  const alternate = draft.alternateContent;
  if (!alternate || !Object.values(alternate).some((field) => field.trim()))
    return content;
  const row = {
    localeCode: locale === "th" ? "en" : "th",
    title: alternate.eventName,
    description: alternate.description,
    locationName: alternate.locationName,
    floorZone: alternate.locationDetail,
  };
  return sameText(content.translations[0], row)
    ? content
    : { ...content, translations: [...content.translations, row] };
}

export function restoreEventDraft(
  workspace: EventWorkspace,
  userId: string,
  locale: string,
): EventWorkspace {
  if (!canEditLocalEventSetup(workspace)) return workspace;
  const shared = readEventDraft(eventDraftV2Key(userId, workspace.eventId));
  if (shared?.content) {
    return projectEventContent(
      { ...workspace, ...shared, hasLocalDraft: true },
      locale,
    );
  }

  const legacyKey = (language: string) =>
    eventDraftKey(userId, workspace.eventId, language);
  if (!workspace.content) {
    const legacy = readEventDraft(legacyKey(locale));
    return legacy
      ? { ...workspace, ...legacy, hasLocalDraft: true }
      : workspace;
  }

  const legacy = legacyEventSetupLocales.flatMap((language) => {
    const draft = readEventDraft(legacyKey(language));
    return draft ? [{ language, draft }] : [];
  });
  const common =
    legacy.find(
      ({ language }) => language === workspace.content?.defaultLocale,
    ) ?? legacy[0];
  if (!common) return workspace;

  // V1 stored shared settings twice without timestamps. Use the event default
  // language's saved settings when present and keep each locale's own text.
  const serverTranslations = new Map(
    workspace.content.translations.map((row) => [row.localeCode, row]),
  );
  const translations = new Map(serverTranslations);
  const oldFallback = resolveEventTranslation(workspace.content, "th");
  const legacyRows = legacy.map(({ language, draft }) =>
    legacyDraftContent(draft, language),
  );
  for (const entry of legacyRows) {
    for (const row of entry.translations) {
      if (row.localeCode !== entry.defaultLocale)
        translations.set(row.localeCode, row);
    }
  }
  for (const entry of legacyRows) {
    const row = resolveEventTranslation(entry);
    const baseline = serverTranslations.get(row.localeCode) ?? oldFallback;
    const primary = {
      ...row,
      floorZone: row.floorZone ?? baseline.floorZone,
    };
    // An unchanged primary can be a workspace fallback saved with shared
    // settings. An explicitly edited primary takes precedence over alternate.
    if (!sameText(primary, baseline)) translations.set(row.localeCode, primary);
  }
  return projectEventContent(
    {
      ...workspace,
      ...common.draft,
      content: {
        ...workspace.content,
        translations: [...translations.values()],
      },
      hasLocalDraft: true,
    },
    locale,
  );
}

function parseEventDraft(value: unknown): EventDraft | null {
  const parsed = eventDraftSchema.safeParse(value);
  if (!parsed.success) return null;
  const { startsAt, endsAt } = parsed.data;
  if (startsAt && endsAt && Date.parse(endsAt) <= Date.parse(startsAt))
    return null;
  return parsed.data;
}

function readEventDraft(key: string): EventDraft | null {
  try {
    const raw = globalThis.localStorage.getItem(key);
    return raw ? parseEventDraft(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

/** Store only valid draft fields; keep an earlier valid save when validation fails. */
export function saveEventDraft(
  key: string,
  draft: EventDraft,
): DraftSaveStatus {
  const parsed = parseEventDraft(draft);
  if (!parsed) return "invalid";
  try {
    globalThis.localStorage.setItem(
      key,
      JSON.stringify(projectEventContent(parsed)),
    );
    notifyEventSetupSaved(key);
    return "saved";
  } catch {
    return "error";
  }
}
