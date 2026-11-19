"use client";

import Input from "@/components/form/input/InputField";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";

interface Props {
  kind: "registration" | "survey";
  capacity: number | null;
  readOnly: boolean;
  onChange: (value: number | null) => void;
}

const nonDigit = /[^0-9]/;

export default function EventCapacitySettings({
  kind,
  capacity,
  readOnly,
  onChange,
}: Props) {
  const t = useTranslations("eventHome.details.capacity");
  const v = useTranslations("eventSetupDesign");
  const id = useId();
  const [invalid, setInvalid] = useState(false);
  const showError = !readOnly && invalid;
  const registration = kind === "registration";

  function update(value: string) {
    const limit = value === "" ? null : Number(value);
    if (nonDigit.test(value) || (limit !== null && (!Number.isSafeInteger(limit) || limit < 1))) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    onChange(limit);
  }

  return (
    <div className="es-capacity">
      <label htmlFor={id}>{registration ? v("registrationLimit") : t("surveyCapacity")}</label>
      <div className="es-capacity-field">
        <Input
          id={id}
          inputMode="numeric"
          pattern="[0-9]*"
          className="es-capacity-input"
          placeholder={t("unlimited")}
          value={capacity?.toString() ?? ""}
          readOnly={readOnly}
          aria-invalid={showError}
          aria-describedby={showError ? id + "-error" : undefined}
          onChange={(event) => update(event.currentTarget.value)}
          onPaste={(event) => {
            if (!readOnly && nonDigit.test(event.clipboardData.getData("text/plain"))) {
              event.preventDefault();
              setInvalid(true);
            }
          }}
        />
        <span aria-hidden="true">{registration ? v("people") : t("responses")}</span>
      </div>
      {showError && (
        <p id={id + "-error"} className="es-capacity-error" role="alert">
          {t("invalid")}
        </p>
      )}
    </div>
  );
}
