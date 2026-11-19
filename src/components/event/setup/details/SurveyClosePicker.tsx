"use client";

import DateTimePicker from "@/components/form/DateTimePicker";
import { shiftBangkokMinute } from "@/core/i18n/bangkok-datetime";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface Props {
  initial: string | null;
  endsAt: string | null;
  displayValue: string;
  readOnly: boolean;
  onSelectCustom: (value: string) => void;
  onUseEventEnd: () => void;
}

export default function SurveyClosePicker({
  initial,
  endsAt,
  displayValue,
  readOnly,
  onSelectCustom,
  onUseEventEnd,
}: Props) {
  const t = useTranslations("eventSetupDesign");
  const common = useTranslations("eventHome.details.capacity");
  const [selection, setSelection] = useState<string | null>(null);

  const endMinute = shiftBangkokMinute(endsAt, 0);
  const min = endsAt && endMinute && Date.parse(endMinute) < Date.parse(endsAt)
    ? shiftBangkokMinute(endsAt, 1) : endMinute;

  return (
    <DateTimePicker
      id="post-survey-close"
      label={t("closes")}
      blockPast
      min={min}
      value={selection ?? initial}
      readOnly={readOnly}
      onChange={setSelection}
      popover={{
        displayValue: selection ? undefined : displayValue,
        cancelLabel: common("cancel"),
        preset: { label: t("withEvent"), onSelect: onUseEventEnd },
        actionsClassName: "es-survey-close-actions",
        onDismiss: (discardSelection) => {
          if (!discardSelection && selection) onSelectCustom(selection);
          setSelection(null);
        },
      }}
    />
  );
}
