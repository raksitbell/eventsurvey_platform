import SurveyClosePicker from "./SurveyClosePicker";
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
  const selected = draft.surveyCloseMode ?? "event";
  const closesAt = selected === "custom" ? draft.surveyCustomClose ?? null : surveyClosingTime(draft);
  const end = {
    event: v("withEvent"),
    week: v("afterWeek"),
    fortnight: v("afterFortnight"),
    custom:
      toBangkokInput(draft.surveyCustomClose ?? null).replace(/^(\d{4})-(\d{2})-(\d{2})T/, "$3/$2/$1 ") ||
      v("custom"),
  }[selected];
  return (
    <section id="survey-schedule" tabIndex={-1} className="es-window">
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
          <span className="es-window-badge">{v(selected === "event" ? "eventBound" : "postSurvey")}</span>
        </header>
        <div className="es-survey-times">
          <div>
            <span>{v("opens")}</span>
            <strong>{v("onStart")}</strong>
          </div>
          <SurveyClosePicker
            initial={closesAt}
            endsAt={draft.endsAt}
            displayValue={end}
            readOnly={readOnly || !draft.hasSurvey}
            onSelectCustom={(surveyCustomClose) => onChange({ surveyCloseMode: "custom", surveyCustomClose })}
            onUseEventEnd={() => onChange({ surveyCloseMode: "event" })}
          />
        </div>
        {draft.hasSurvey &&
          draft.surveyCloseMode === "custom" &&
          draft.endsAt &&
          (!closesAt || Date.parse(closesAt) < Date.parse(draft.endsAt)) && (
            <p role="alert" className="text-error-600 dark:text-error-400">
              {t("closeError")}
            </p>
          )}
      </fieldset>
    </section>
  );
}
