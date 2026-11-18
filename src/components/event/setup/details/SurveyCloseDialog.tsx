"use client";

import DateTimePicker from "@/components/form/DateTimePicker";
import { Modal } from "@/components/ui/modal";
import { fromBangkokInput, toBangkokInput } from "@/core/i18n/bangkok-datetime";
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
  const [date, setDate] = useState(
    toBangkokInput(initial ?? endsAt).slice(0, 10),
  );
  const [time, setTime] = useState(
    toBangkokInput(initial ?? endsAt).slice(11) || "00:00",
  );
  const [invalid, setInvalid] = useState(false);
  const endLabel = endsAt
    ? new Intl.DateTimeFormat(locale, {
        timeZone: "Asia/Bangkok",
        dateStyle: "medium",
        timeStyle: "short",
        hourCycle: "h23",
      }).format(new Date(endsAt))
    : "—";
  function apply() {
    const close = fromBangkokInput(date + "T" + time);
    if (!close || (endsAt && Date.parse(close) < Date.parse(endsAt))) {
      setInvalid(true);
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
            if (target.type === "time") apply();
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
            dateOnly
            value={fromBangkokInput(date + "T00:00")}
            onChange={(next) => {
              setDate(toBangkokInput(next).slice(0, 10));
              setInvalid(false);
            }}
          />
          <label htmlFor={id + "-time"}>
            {t("time")}
            <input
              id={id + "-time"}
              type="time"
              value={time}
              onChange={(event) => {
                setTime(event.target.value);
                setInvalid(false);
              }}
            />
          </label>
        </div>
        {invalid ? (
          <p role="alert">{s("closeError")}</p>
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
