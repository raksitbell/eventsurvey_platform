"use client";

import DateTimePicker from "@/components/form/DateTimePicker";
import { Modal } from "@/components/ui/modal";
import { isPastScheduleMinute } from "@/core/event/schedule";
import { shiftBangkokMinute } from "@/core/i18n/bangkok-datetime";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";

interface Props {
  initial: string | null;
  endsAt: string | null;
  onClose: () => void;
  onApply: (value: string) => void;
}

export default function SurveyCloseDialog({
  initial,
  endsAt,
  onClose,
  onApply,
}: Props) {
  const t = useTranslations("eventSetupDesign");
  const s = useTranslations("eventSetup");
  const dates = useTranslations("datePicker");
  const common = useTranslations("eventHome.details.capacity");
  const locale = useLocale();
  const id = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const previous = globalThis.document.activeElement;
    heading.current?.focus({ preventScroll: true });
    return () => {
      if (previous instanceof HTMLElement)
        previous.focus({ preventScroll: true });
    };
  }, []);
  const endMinute = shiftBangkokMinute(endsAt, 0);
  const min = endsAt && endMinute && Date.parse(endMinute) < Date.parse(endsAt)
    ? shiftBangkokMinute(endsAt, 1) : endMinute;
  const [close, setClose] = useState(initial ?? min);
  const [error, setError] = useState<string | null>(null);
  const endLabel = endsAt
    ? new Intl.DateTimeFormat(locale, {
        timeZone: "Asia/Bangkok",
        dateStyle: "medium",
        timeStyle: "short",
        hourCycle: "h23",
      }).format(new Date(endsAt))
    : "—";
  function apply() {
    if (isPastScheduleMinute(close)) {
      setError(dates("pastDate"));
      return;
    }
    if (!close || (endsAt && Date.parse(close) < Date.parse(endsAt))) {
      setError(s("closeError"));
      return;
    }
    onApply(close);
  }
  return (
    <Modal
      isOpen
      onClose={onClose}
      showCloseButton={false}
      labelledBy={id}
      className="es-survey-close-dialog"
      backdropClassName="es-setup-scrim"
    >
      <div
        className="contents"
        onKeyDown={(event) => {
          const target = event.target;
          if (event.key === "Enter" && target instanceof HTMLInputElement) {
            event.preventDefault();
            return;
          }
          if (event.key !== "Tab") return;
          const controls = event.currentTarget.querySelectorAll<HTMLElement>(
            "input:not(:disabled), button:not(:disabled)",
          );
          const first = controls[0],
            last = controls[controls.length - 1];
          if (
            event.shiftKey &&
            (target === first || target === heading.current)
          ) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && target === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
      >
        <header>
          <h2 id={id} tabIndex={-1} ref={heading}>
            {t("customTitle")}
          </h2>
          <p>{t("customDescription")}</p>
        </header>
        <div className="es-survey-end es-icon-label es-date-label">
          {t("eventEnds", { date: endLabel })}
        </div>
        <div className="es-survey-close-fields">
          <DateTimePicker
            id={id + "-date"}
            label={t("closingDate")}
            blockPast
            min={min}
            value={close}
            onChange={(next) => {
              setClose(next);
              setError(null);
            }}
          />
        </div>
        {error ? (
          <p role="alert">{error}</p>
        ) : (
          <p>{t("closingRule")}</p>
        )}
        <footer>
          <button type="button" onClick={onClose}>
            {common("cancel")}
          </button>
          <button type="button" onClick={apply}>
            {t("applyTime")}
          </button>
        </footer>
      </div>
    </Modal>
  );
}
