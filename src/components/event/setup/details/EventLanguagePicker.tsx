"use client";

import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import {
  contentLanguageName,
  normalizeContentLocale,
} from "@/core/event/content";
import {
  ChevronDownIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { useId, useRef, useState } from "react";

const suggestedCodes = ["ja", "zh", "ko", "fr"];

interface EventLanguagePickerProps {
  uiLocale: string;
  existing: string[];
  onAdd: (code: string) => void;
  onCancel: () => void;
}

export default function EventLanguagePicker({
  uiLocale,
  existing,
  onAdd,
  onCancel,
}: EventLanguagePickerProps) {
  const t = useTranslations("eventHome.details.languages");
  const id = useId();
  const selector = useRef<HTMLButtonElement>(null);
  const [choice, setChoice] = useState("");
  const [custom, setCustom] = useState("");
  const [choicesOpen, setChoicesOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const customSelected = choice === "custom";
  const code = normalizeContentLocale(customSelected ? custom : choice);
  const duplicate = !!code && existing.includes(code);
  const invalid = customSelected && !!custom.trim() && !code;
  const error = duplicate
    ? t("duplicate")
    : invalid
      ? t("invalidCode")
      : undefined;
  const canAdd = !!code && !duplicate;

  const select = (value: string) => {
    setChoice(value);
    setCustom("");
    setChoicesOpen(false);
    selector.current?.focus();
  };

  return (
    <div className="space-y-2">
      {!existing.includes("en") && (
        <>
          <p className="text-xs text-event-display-muted dark:text-gray-300">
            {t("templateHint")}
          </p>
          <Button
            size="sm"
            variant="outline"
            className="min-h-10.5 w-full text-xs! leading-tight font-semibold text-event-display-text! ring-event-display-border! focus-visible:outline-event-action dark:text-white/90! dark:ring-gray-600!"
            onClick={() => onAdd("en")}
          >
            {t("template")}
          </Button>
        </>
      )}
      <div className="flex items-center justify-between gap-2">
        {customSelected ? (
          <Label
            htmlFor={`${id}-custom`}
            className="mb-0 text-xs font-semibold"
          >
            {t("codeLabel")}
          </Label>
        ) : (
          <span
            id={`${id}-code-label`}
            className="text-xs font-semibold text-gray-700 dark:text-gray-300"
          >
            {t("codeLabel")}
          </span>
        )}
        <button
          type="button"
          aria-label={t("codeHelpLabel")}
          aria-expanded={helpOpen}
          aria-controls={`${id}-help`}
          onClick={() => {
            setHelpOpen(!helpOpen);
            setChoicesOpen(false);
          }}
          className="grid size-6.5 shrink-0 place-items-center rounded-lg border border-event-border bg-event-subtle text-gray-900 focus-visible:outline-2 focus-visible:outline-event-action dark:border-gray-700 dark:bg-gray-800 dark:text-white/90"
        >
          <InformationCircleIcon className="size-4" aria-hidden="true" />
        </button>
      </div>
      {helpOpen && (
        <div
          id={`${id}-help`}
          className="space-y-1 rounded-lg bg-event-subtle p-2 text-picker-small leading-[inherit] text-event-display-muted dark:bg-gray-800 dark:text-gray-300"
        >
          <p>{t("codeHelp")}</p>
          <a
            href="https://en.wikipedia.org/wiki/List_of_ISO_639_language_codes"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-event-action underline dark:text-brand-300"
          >
            {t("codeHelpLink")}
          </a>
        </div>
      )}
      <button
        ref={selector}
        type="button"
        aria-expanded={choicesOpen}
        aria-controls={`${id}-options`}
        aria-describedby={customSelected ? undefined : `${id}-code-label`}
        onClick={() => {
          setChoicesOpen(!choicesOpen);
          setHelpOpen(false);
        }}
        className="flex min-h-10.5 w-full items-center justify-between gap-2 rounded-picker border border-event-display-border px-3 text-start text-xs font-medium text-event-display-text hover:bg-event-subtle focus-visible:outline-2 focus-visible:outline-event-action dark:border-gray-600 dark:text-white/90 dark:hover:bg-gray-800"
      >
        {customSelected
          ? t("custom")
          : code
            ? `${code.toUpperCase()} · ${contentLanguageName(code)}`
            : t("choose")}
        <ChevronDownIcon className="size-4 shrink-0" aria-hidden="true" />
      </button>
      {choicesOpen && (
        <ul
          id={`${id}-options`}
          className="max-h-30 overflow-y-auto rounded-picker border border-event-display-border dark:border-gray-600"
        >
          {suggestedCodes
            .filter((item) => !existing.includes(item))
            .map((item) => (
              <li key={item}>
                <button
                  type="button"
                  onClick={() => select(item)}
                  className="w-full px-3 py-2 text-start text-xs text-event-display-text hover:bg-event-subtle focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-event-action dark:text-white/90 dark:hover:bg-gray-800"
                >
                  {t("option", {
                    language: contentLanguageName(item, uiLocale),
                    code: item.toUpperCase(),
                  })}
                </button>
              </li>
            ))}
          <li>
            <button
              type="button"
              onClick={() => select("custom")}
              className="w-full px-3 py-2 text-start text-xs text-event-display-text hover:bg-event-subtle focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-event-action dark:text-white/90 dark:hover:bg-gray-800"
            >
              {t("customOption")}
            </button>
          </li>
        </ul>
      )}
      {customSelected && (
        <>
          <Input
            id={`${id}-custom`}
            value={custom}
            onChange={(event) => setCustom(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              if (canAdd) onAdd(code);
            }}
            placeholder={t("customPlaceholder")}
            aria-describedby={`${id}-feedback`}
            aria-invalid={!!error}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            className="uppercase"
            error={!!error}
            dir="ltr"
          />
          <p
            id={`${id}-feedback`}
            role={error ? "alert" : undefined}
            className={`text-picker-small leading-[inherit] ${error ? "text-error-600 dark:text-error-400" : "text-event-display-muted dark:text-gray-300"}`}
          >
            {error ?? t("customHint")}
          </p>
        </>
      )}
      <button
        type="button"
        disabled={!canAdd}
        onClick={() => {
          if (canAdd) onAdd(code);
        }}
        className="min-h-10 w-full rounded-picker border border-event-border bg-event-action px-2 text-xs font-semibold text-white hover:brightness-95 focus-visible:outline-2 focus-visible:outline-event-action disabled:cursor-not-allowed disabled:bg-event-subtle disabled:text-event-display-muted dark:border-gray-700 dark:disabled:bg-gray-800 dark:disabled:text-gray-400"
      >
        {t(choice ? "confirm" : "chooseFirst")}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="min-h-6 w-full rounded-md text-picker-small leading-[inherit] text-event-display-muted hover:underline focus-visible:outline-2 focus-visible:outline-event-action dark:text-gray-300"
      >
        {t("cancel")}
      </button>
    </div>
  );
}
