"use client";

import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { useModal } from "@/hooks/useModal";
import { useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";

interface Props {
  kind: "registration" | "survey";
  capacity: number | null;
  readOnly: boolean;
  onChange: (value: number | null) => void;
}

export default function EventCapacitySettings({
  kind,
  capacity,
  readOnly,
  onChange,
}: Props) {
  const t = useTranslations("eventHome.details.capacity");
  const v = useTranslations("eventSetupDesign");
  const { isOpen, openModal, closeModal } = useModal();
  const [custom, setCustom] = useState("");
  const [invalid, setInvalid] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const close = () => {
    closeModal();
    trigger.current?.focus();
  };
  const open = () => {
    setInvalid(false);
    setCustom(capacity?.toString() ?? "");
    openModal();
  };
  const choose = (value: number) => {
    if (!Number.isSafeInteger(value) || value <= 0) {
      setInvalid(true);
      return;
    }
    onChange(value);
    close();
  };
  return (
    <fieldset
      disabled={readOnly}
      className="es-capacity"
      onKeyDown={(e) => {
        if (isOpen && e.key === "Escape") {
          e.stopPropagation();
          close();
        }
      }}
    >
      <legend>
        {kind === "registration" ? v("registrationLimit") : t("surveyCapacity")}
      </legend>
      <div className="es-capacity-options">
        <button
          type="button"
          className="event-option"
          aria-pressed={capacity == null}
          onClick={() => {
            closeModal();
            onChange(null);
          }}
        >
          {t("unlimited")}
        </button>
        <button
          type="button"
          className="event-option dropdown-toggle"
          ref={trigger}
          aria-controls={isOpen ? id : undefined}
          aria-expanded={isOpen}
          aria-pressed={capacity != null}
          onClick={() => (isOpen ? close() : open())}
        >
          {t("limited")}
        </button>
      </div>
      {capacity != null && (
        <button
          type="button"
          className="es-limit-value dropdown-toggle"
          onClick={open}
        >
          <span>{capacity}</span>
          <span>{v("people")}</span>
        </button>
      )}
      <Dropdown
        isOpen={isOpen}
        onClose={closeModal}
        className="es-limit-popover"
      >
        <div id={id} role="group" aria-labelledby={id + "-title"}>
          <header>
            <strong id={id + "-title"}>
              {kind === "registration" ? v("registrants") : t("surveyCapacity")}
            </strong>
            <button type="button" aria-label={t("close")} onClick={close}>
              ×
            </button>
          </header>
          <small>{v("positive")}</small>
          {[100, 200, 500].map((n) => (
            <button
              type="button"
              className="es-limit-preset"
              key={n}
              onClick={() => choose(n)}
            >
              {v("peopleCount", { count: n })}
            </button>
          ))}
          <div className="es-limit-custom">
            <input
              type="number"
              min={1}
              step={1}
              aria-label={t("maximum")}
              aria-invalid={invalid}
              value={custom}
              placeholder={t("maximum")}
              onChange={(e) => {
                setCustom(e.target.value);
                setInvalid(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  choose(Number(custom));
                }
              }}
            />
            <button type="button" onClick={() => choose(Number(custom))}>
              {t("save")}
            </button>
          </div>
          {invalid && <small role="alert">{t("invalid")}</small>}
        </div>
      </Dropdown>
    </fieldset>
  );
}
