"use client";

import { useState } from "react";
import { normalizeEventAccess } from "@/core/event/access";
import { projectEventContent } from "@/core/event/content";
import { eventDraftFieldsSchema, eventDraftSchema } from "@/core/event/draft";
import useSetupApiState, { type SetupDraftApi } from "@/hooks/useSetupApiState";
import type { DraftSaveStatus, EventDraft } from "@/types/event/setup";
import type { EventWorkspace } from "@/types/event/workspace";

export default function useEventDraft(
  workspace: EventWorkspace,
  _userId: string,
  locale: string,
  sharedApi?: SetupDraftApi,
) {
  const ownApi = useSetupApiState(workspace);
  const api = sharedApi ?? ownApi;
  const setup = workspace.setup;
  const readOnly = !workspace.canEditEvent || !!setup?.publication;
  const [edit, setEdit] = useState<{ value: EventDraft; revision: number } | null>(
    null,
  );
  const [acknowledged, setAcknowledged] = useState<{ value: EventDraft; revision: number } | null>(
    null,
  );
  const [status, setStatus] = useState<DraftSaveStatus | "idle">("idle");
  const stored =
    setup?.publication?.draft ??
    (acknowledged && acknowledged.revision > (setup?.revision ?? 0)
      ? acknowledged.value
      : setup?.draft);
  const value = readOnly ? stored ?? workspace : edit?.value ?? stored ?? workspace;
  const schema = setup?.publication || workspace.eventStatus !== "draft" ? eventDraftFieldsSchema : eventDraftSchema;
  const parsed = schema.safeParse(value);
  const draft = parsed.success
    ? projectEventContent(parsed.data, locale)
    : (value as EventDraft);

  function change(changes: Partial<EventDraft>) {
    if (readOnly) return;
    const revision = api.getRevision();
    setEdit((current) => ({
      revision: current?.revision ?? revision,
      value: projectEventContent(
        normalizeEventAccess({ ...(current?.value ?? draft), ...changes }),
        locale,
      ),
    }));
    setStatus("idle");
  }

  async function save() {
    if (readOnly || (!edit && stored)) return true;
    if (!parsed.success) {
      setStatus("invalid");
      return false;
    }
    const result = await api.save({ draft: parsed.data }, edit?.revision);
    if (!result?.draft) {
      setStatus("error");
      return false;
    }
    setAcknowledged({ value: result.draft, revision: result.revision });
    setEdit((current) => (current === edit ? null : current));
    setStatus("saved");
    return true;
  }

  return { draft, status, readOnly, change, save, dirty: !readOnly && !!edit };
}
