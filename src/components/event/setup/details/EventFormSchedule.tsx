import SurveyClosePicker from "./SurveyClosePicker";
import { toBangkokInput } from "@/core/i18n/bangkok-datetime";
import { surveyClosingTime } from "@/core/event/schedule";
import type { EventDraft } from "@/types/event/setup";
import { useTranslations } from "next-intl";

interface Props {
  kind: "registration" | "survey";
  draft: EventDraft;
  readOnly: boolean;
  onChange: (changes: Partial<EventDraft>) => void;
}

export default function EventFormSchedule({
  kind,
  draft,
  readOnly,
  onChange,
}: Props) {
  const t = useTranslations("eventSetup");
  const v = useTranslations("eventSetupDesign");
  const survey = kind === "survey";
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
    <div
      className="es-form-times"
      id={survey ? "survey-schedule" : undefined}
      tabIndex={survey ? -1 : undefined}
      role="group"
      aria-label={t("schedule")}
    >
      <dl>
        <dt>{v("opens")}</dt>
        <dd>{v("onStart")}</dd>
      </dl>
      {survey ? (
        <SurveyClosePicker
          initial={closesAt}
          endsAt={draft.endsAt}
          displayValue={end}
          readOnly={readOnly}
          onSelectCustom={(surveyCustomClose) => onChange({ surveyCloseMode: "custom", surveyCustomClose })}
          onUseEventEnd={() => onChange({ surveyCloseMode: "event" })}
        />
      ) : (
        <dl>
          <dt>{v("closes")}</dt>
          <dd>{v("withEvent")}</dd>
        </dl>
      )}
      {survey && selected === "custom" && draft.endsAt &&
        (!closesAt || Date.parse(closesAt) < Date.parse(draft.endsAt)) && (
          <p role="alert" className="col-span-full text-theme-sm text-error-600 dark:text-error-400">
            {t("closeError")}
          </p>
        )}
    </div>
  );
}
