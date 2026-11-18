import DateTimePicker from "@/components/form/DateTimePicker";
import { surveyClosingTime } from "@/core/event/schedule";
import type { EventDraft } from "@/types/event/setup";
import { useTranslations } from "next-intl";

interface Props {
  draft: EventDraft;
  readOnly: boolean;
  onChange: (changes: Partial<EventDraft>) => void;
}

export default function EventFormSchedule({
  draft,
  readOnly,
  onChange,
}: Props) {
  const t = useTranslations("eventSetup");
  return (
    <section className="event-section space-y-3">
      <h2 className="font-semibold">{t("schedule")}</h2>
      <p className="text-sm">{t("registrationWindow")}</p>
      <fieldset
        disabled={readOnly || !draft.hasSurvey}
        className="space-y-2 disabled:opacity-60"
      >
        <legend className="mb-2 text-sm font-semibold">
          {t("surveyWindow")}
        </legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(["event", "week", "fortnight", "custom"] as const).map((mode) => (
            <button
              type="button"
              key={mode}
              className="event-option"
              aria-pressed={(draft.surveyCloseMode ?? "week") === mode}
              onClick={() => onChange({ surveyCloseMode: mode })}
            >
              {t(mode)}
            </button>
          ))}
        </div>
        {draft.surveyCloseMode === "custom" && (
          <DateTimePicker
            id="survey-close"
            label={t("closeTime")}
            readOnly={readOnly || !draft.hasSurvey}
            value={draft.surveyCustomClose ?? null}
            onChange={(value) => onChange({ surveyCustomClose: value })}
          />
        )}
        {draft.hasSurvey &&
          draft.surveyCloseMode === "custom" &&
          draft.endsAt &&
          (!surveyClosingTime(draft) ||
            Date.parse(surveyClosingTime(draft)!) <
              Date.parse(draft.endsAt)) && (
            <p role="alert" className="text-error-600 dark:text-error-400">
              {t("closeError")}
            </p>
          )}
      </fieldset>
    </section>
  );
}
