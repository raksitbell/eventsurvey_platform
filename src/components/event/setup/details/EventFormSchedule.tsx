import SurveyCloseDialog from "./SurveyCloseDialog";
import { useModal } from "@/hooks/useModal";
import { toBangkokInput } from "@/core/i18n/bangkok-datetime";
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
  const v = useTranslations("eventSetupDesign");
  const dialog = useModal();
  const selected = draft.surveyCloseMode ?? "week";
  const end = {
    event: v("withEvent"),
    week: v("afterWeek"),
    fortnight: v("afterFortnight"),
    custom:
      toBangkokInput(draft.surveyCustomClose ?? null).replace("T", " ") ||
      v("custom"),
  }[selected];
  return (
    <section className="es-window">
      <h2 className="es-icon-label es-date-label">{t("schedule")}</h2>
      <div className="es-window-reg">
        <span className="es-window-icon" aria-hidden="true" />
        <div>
          <strong>{v("registration")}</strong>
          <small>{v("registrationHint")}</small>
        </div>
        <span className="es-window-badge">{v("eventBound")}</span>
      </div>
      <fieldset
        disabled={readOnly || !draft.hasSurvey}
        className="es-survey-window"
      >
        <legend className="sr-only">{t("surveyWindow")}</legend>
        <header>
          <div>
            <strong>{v("survey")}</strong>
            <small>{v("surveyHint")}</small>
          </div>
          <span className="es-window-badge">{v("postSurvey")}</span>
        </header>
        <div className="es-survey-times">
          <div>
            <span>{v("opens")}</span>
            <strong>{v("onStart")}</strong>
          </div>
          <div>
            <span>{v("closes")}</span>
            <strong>{end}</strong>
          </div>
        </div>
        <div className="es-schedule-presets">
          <span>{v("closes")}</span>
          {(["event", "week", "fortnight", "custom"] as const).map((mode) => (
            <button
              type="button"
              key={mode}
              className="event-option"
              aria-pressed={(draft.surveyCloseMode ?? "week") === mode}
              onClick={() =>
                mode === "custom"
                  ? dialog.openModal()
                  : onChange({ surveyCloseMode: mode })
              }
            >
              {t(mode)}
            </button>
          ))}
        </div>
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
      {dialog.isOpen && (
        <SurveyCloseDialog
          initial={draft.surveyCustomClose ?? null}
          endsAt={draft.endsAt}
          onClose={dialog.closeModal}
          onApply={(surveyCustomClose) => {
            onChange({ surveyCloseMode: "custom", surveyCustomClose });
            dialog.closeModal();
          }}
        />
      )}
    </section>
  );
}
