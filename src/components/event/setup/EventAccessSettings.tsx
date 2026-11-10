"use client";

import Radio from "@/components/form/input/Radio";
import Switch from "@/components/form/switch/Switch";
import { Link } from "@/i18n/navigation";
import EventCapacitySettings from "@/components/event/setup/EventCapacitySettings";
import type { EventDraft } from "@/types/event/setup";
import {
  ClipboardDocumentListIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";

interface EventAccessSettingsProps {
  draft: EventDraft;
  readOnly: boolean;
  onChange: (changes: Partial<EventDraft>) => void;
  onNavigate: () => boolean;
}

export default function EventAccessSettings({
  draft,
  readOnly,
  onChange,
  onNavigate,
}: EventAccessSettingsProps) {
  const t = useTranslations("eventHome.details");
  return (
    <section className="min-w-0 space-y-3 rounded-xl border border-gray-300 bg-white p-4 lg:col-span-2 dark:border-gray-700 dark:bg-gray-900">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white/90">
        {t("access")}
      </h2>
      <div className="flex items-center justify-between gap-3 py-1">
        <label
          htmlFor="event-access"
          className="flex items-center gap-2 text-theme-sm text-gray-800 dark:text-gray-200"
        >
          <GlobeAltIcon
            className="size-4.5 shrink-0 text-event-action dark:text-brand-400"
            aria-hidden="true"
          />
          {t(draft.isPrivate ? "private" : "public")}
        </label>
        <Switch
          id="event-access"
          label={t(draft.isPrivate ? "private" : "public")}
          checked={draft.isPrivate}
          disabled={readOnly}
          onChange={(checked) => onChange({ isPrivate: checked })}
        />
      </div>
      {(
        [
          { key: "hasRegistration", Icon: UserGroupIcon },
          { key: "hasSurvey", Icon: ClipboardDocumentListIcon },
        ] as const
      ).map(({ key, Icon }) => (
        <fieldset key={key} className="min-w-0 space-y-1" disabled={readOnly}>
          <legend className="mb-1 flex items-center gap-2 text-theme-sm text-gray-800 dark:text-gray-200">
            <Icon
              className="size-4.5 shrink-0 text-event-action dark:text-brand-400"
              aria-hidden="true"
            />
            {t(key)}
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {([false, true] as const).map((enabled) => (
              <Radio
                key={String(enabled)}
                id={`${key}-${enabled}`}
                name={key}
                value={String(enabled)}
                checked={draft[key] === enabled}
                label={t(enabled ? "formOn" : "formOff")}
                disabled={readOnly}
                onChange={() => onChange({ [key]: enabled })}
              />
            ))}
          </div>
          {key === "hasRegistration" && draft.isPrivate && (
            <div className="space-y-2 pt-1">
              <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                {t(
                  draft.hasRegistration
                    ? "whitelistHint"
                    : "privateRegistrationHint",
                )}
              </p>
              {draft.hasRegistration && (
                <Link
                  href="/event/whitelist"
                  onClick={(event) => {
                    if (!onNavigate()) event.preventDefault();
                  }}
                  className="flex h-11 w-full items-center justify-center rounded-preview-control border border-event-action bg-event-subtle text-theme-sm text-participant-text focus-visible:outline-2 focus-visible:outline-event-action dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                >
                  {t("manageWhitelist")}
                </Link>
              )}
            </div>
          )}
        </fieldset>
      ))}
      {draft.hasSurvey && (
        <fieldset disabled={readOnly} className="min-w-0 space-y-1">
          <legend className="mb-1 flex items-center gap-2 text-theme-sm text-gray-800 dark:text-gray-200">
            <ShieldCheckIcon
              className="size-4.5 shrink-0 text-event-action dark:text-brand-400"
              aria-hidden="true"
            />
            {t("surveyAccess")}
          </legend>
          <div className="grid grid-cols-2 gap-2">
            <Radio
              id="survey-direct"
              name="survey-access"
              value="public"
              checked={(draft.surveyAccess ?? "public") === "public"}
              label={t("direct")}
              disabled={readOnly}
              onChange={() => onChange({ surveyAccess: "public" })}
            />
            <Radio
              id="survey-registered"
              name="survey-access"
              value="registered_only"
              checked={draft.surveyAccess === "registered_only"}
              label={t("registered")}
              disabled={readOnly || !draft.hasRegistration}
              unavailable={!draft.hasRegistration}
              disabledReason={
                !draft.hasRegistration ? t("registrationNeeded") : undefined
              }
              onChange={() => onChange({ surveyAccess: "registered_only" })}
            />
          </div>
        </fieldset>
      )}
      {(draft.hasRegistration || draft.hasSurvey) && (
        <EventCapacitySettings
          draft={draft}
          readOnly={readOnly}
          onChange={onChange}
        />
      )}
    </section>
  );
}
