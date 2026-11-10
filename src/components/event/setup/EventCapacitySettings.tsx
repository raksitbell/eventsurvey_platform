"use client";

import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import Radio from "@/components/form/input/Radio";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import type { EventDraft } from "@/types/event/setup";
import { useModal } from "@/hooks/useModal";
import {
  AdjustmentsHorizontalIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";

interface EventCapacitySettingsProps {
  draft: EventDraft;
  readOnly: boolean;
  onChange: (changes: Partial<EventDraft>) => void;
}

export default function EventCapacitySettings(
  props: EventCapacitySettingsProps,
) {
  const { draft, readOnly, onChange } = props;
  const t = useTranslations("eventHome.details.capacity");
  const { isOpen, openModal, closeModal } = useModal();
  const trigger = useRef<HTMLButtonElement>(null);
  const close = () => {
    closeModal();
    trigger.current?.focus();
  };
  const limit = (value: number | null | undefined) =>
    value == null ? t("unlimited") : value.toLocaleString();
  const summary = [
    draft.hasRegistration &&
      t("registrationSummary", { limit: limit(draft.registrationCapacity) }),
    draft.hasSurvey &&
      t("surveySummary", {
        limit: limit(
          draft.surveyAccess === "registered_only"
            ? draft.registrationCapacity
            : draft.surveyCapacity,
        ),
      }),
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <>
      <button
        ref={trigger}
        type="button"
        onClick={openModal}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className="flex min-h-14 w-full items-center gap-2 rounded-lg border border-event-tile bg-event-subtle px-3 py-2 text-start focus-visible:ring-2 focus-visible:ring-event-action dark:border-gray-700 dark:bg-gray-800"
      >
        <AdjustmentsHorizontalIcon
          className="size-4.5 shrink-0 text-event-action dark:text-brand-400"
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1">
          <span className="block text-theme-sm text-gray-800 dark:text-gray-200">
            {t("title")}
          </span>
          <span className="block text-theme-xs text-gray-500 dark:text-gray-400">
            {summary}
          </span>
        </span>
        <ChevronRightIcon
          className="size-4 shrink-0 text-event-action rtl:rotate-180 dark:text-brand-400"
          aria-hidden="true"
        />
      </button>
      <Modal isOpen={isOpen} onClose={close} showCloseButton={false}>
        {isOpen && (
          <CapacityEditor
            draft={draft}
            readOnly={readOnly}
            onChange={(changes) => {
              onChange(changes);
              close();
            }}
            onClose={close}
          />
        )}
      </Modal>
    </>
  );
}

function CapacityEditor({
  draft,
  readOnly,
  onChange,
  onClose,
}: EventCapacitySettingsProps & { onClose: () => void }) {
  const t = useTranslations("eventHome.details.capacity");
  const [limits, setLimits] = useState({
    registrationCapacity: draft.registrationCapacity ?? null,
    surveyCapacity: draft.surveyCapacity ?? null,
  });
  const [error, setError] = useState(false);
  const shared = draft.hasSurvey && draft.surveyAccess === "registered_only";
  const keys = [
    draft.hasRegistration ? "registrationCapacity" : null,
    draft.hasSurvey && !shared ? "surveyCapacity" : null,
  ].filter((key): key is keyof typeof limits => key !== null);
  const save = () => {
    if (
      keys.some(
        (key) =>
          limits[key] !== null &&
          (!Number.isSafeInteger(limits[key]) || limits[key]! <= 0),
      )
    ) {
      setError(true);
      return;
    }
    onChange(limits);
  };
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white/90">
        {t("title")}
      </h2>
      {keys.map((key) => (
        <fieldset
          key={key}
          disabled={readOnly}
          className="space-y-3 rounded-xl border border-event-tile bg-event-subtle p-4 dark:border-gray-700 dark:bg-gray-800"
        >
          <legend className="text-theme-sm font-semibold text-gray-800 dark:text-gray-200">
            {t(key)}
          </legend>
          <div className="grid grid-cols-2 gap-2">
            <Radio
              id={`${key}-unlimited`}
              name={key}
              value="unlimited"
              checked={limits[key] === null}
              label={t("unlimited")}
              disabled={readOnly}
              onChange={() => setLimits((value) => ({ ...value, [key]: null }))}
            />
            <Radio
              id={`${key}-limited`}
              name={key}
              value="limited"
              checked={limits[key] !== null}
              label={t("limited")}
              disabled={readOnly}
              onChange={() => setLimits((value) => ({ ...value, [key]: 1 }))}
            />
          </div>
          {limits[key] !== null && (
            <div>
              <Label htmlFor={`${key}-number`}>{t("maximum")}</Label>
              <Input
                id={`${key}-number`}
                type="number"
                min={1}
                step={1}
                value={Number.isNaN(limits[key]) ? "" : limits[key]!}
                readOnly={readOnly}
                onChange={(event) => {
                  setError(false);
                  setLimits((value) => ({
                    ...value,
                    [key]:
                      event.target.value === ""
                        ? NaN
                        : Number(event.target.value),
                  }));
                }}
              />
            </div>
          )}
        </fieldset>
      ))}
      {shared && (
        <p className="text-theme-sm text-gray-600 dark:text-gray-300">
          {t("shared")}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="text-theme-sm text-error-600 dark:text-error-400"
        >
          {t("invalid")}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          {t(readOnly ? "close" : "cancel")}
        </Button>
        {!readOnly && (
          <Button
            className="bg-event-action dark:bg-event-action"
            onClick={save}
          >
            {t("save")}
          </Button>
        )}
      </div>
    </div>
  );
}
