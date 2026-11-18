"use client";

import EventLanguagePicker from "@/components/event/setup/details/EventLanguagePicker";
import Button from "@/components/ui/button/Button";
import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { DropdownItem } from "@/components/ui/dropdown/DropdownItem";
import { contentLanguageName } from "@/core/event/content";
import type { EventContent } from "@/types/event/content";
import {
  ChevronDownIcon,
  LanguageIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { useId, useRef, useState, type KeyboardEvent } from "react";

interface EventLanguageDropdownProps {
  content: EventContent;
  selected: string;
  uiLocale: string;
  readOnly: boolean;
  onSelect: (code: string) => void;
  onAdd: (code: string) => void;
}

export default function EventLanguageDropdown({
  content,
  selected,
  uiLocale,
  readOnly,
  onSelect,
  onAdd,
}: EventLanguageDropdownProps) {
  const t = useTranslations("eventHome.details.languages");
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);

  const close = (restoreFocus = false) => {
    setOpen(false);
    setAdding(false);
    if (restoreFocus) trigger.current?.focus();
  };
  const choose = (code: string, change: (value: string) => void) => {
    change(code);
    close(true);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (open && event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close(true);
    }
  };
  const triggerLanguage =
    selected === "th"
      ? contentLanguageName("th", uiLocale)
      : selected.toUpperCase();

  return (
    <div className="es-content-language" onKeyDown={onKeyDown}>
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => (open ? close(true) : setOpen(true))}
        className="es-info-language hover:bg-event-subtle focus-visible:outline-2 focus-visible:outline-event-action sm:w-44! dark:hover:bg-gray-700"
      >
        <LanguageIcon className="size-4.5 shrink-0" aria-hidden="true" />
        <span className="flex-1 text-start">
          {t("trigger", { language: triggerLanguage })}
        </span>
        <ChevronDownIcon className="size-4 shrink-0" aria-hidden="true" />
      </button>
      <Dropdown
        isOpen={open}
        onClose={() => close()}
        triggerRef={trigger}
        className="es-content-language-menu top-full z-50 overflow-y-auto border-event-display-border p-5 dark:border-gray-600 dark:bg-gray-900"
      >
        <div
          id={id}
          role="group"
          aria-labelledby={`${id}-title`}
          className="space-y-3"
        >
          <div className="flex min-h-8 items-center justify-between gap-2">
            <h3
              id={`${id}-title`}
              className="text-picker-heading leading-tight font-semibold text-event-display-text dark:text-white/90"
            >
              {t("heading")}
            </h3>
            <button
              type="button"
              aria-label={t("close")}
              onClick={() => close(true)}
              className="grid size-8 shrink-0 place-items-center rounded-lg text-event-display-text hover:bg-event-subtle focus-visible:outline-2 focus-visible:outline-event-action dark:text-white/90 dark:hover:bg-gray-700"
            >
              <XMarkIcon className="size-4" aria-hidden="true" />
            </button>
          </div>
          <p className="text-xs text-event-display-muted dark:text-gray-300">
            {t("hint")}
          </p>
          <ul
            className="max-h-40 space-y-3 overflow-y-auto"
            aria-label={t("heading")}
          >
            {content.translations.map(({ localeCode }) => (
              <li key={localeCode}>
                <DropdownItem
                  pressed={selected === localeCode}
                  onClick={() => choose(localeCode, onSelect)}
                  baseClassName="min-h-10.5 w-full rounded-picker border border-event-display-border px-2 py-2 text-xs font-semibold text-event-display-text hover:bg-event-subtle focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-event-action dark:border-gray-600 dark:text-white/90 dark:hover:bg-gray-800"
                >
                  {t(
                    localeCode === content.defaultLocale
                      ? "defaultEntry"
                      : "entry",
                    {
                      language: contentLanguageName(localeCode, uiLocale),
                      code: localeCode.toUpperCase(),
                    },
                  )}
                </DropdownItem>
              </li>
            ))}
          </ul>
          {!readOnly && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="min-h-10.5 w-full text-xs! leading-tight font-semibold text-event-display-text! ring-event-display-border! focus-visible:outline-event-action dark:text-white/90! dark:ring-gray-600!"
                onClick={() => setAdding(true)}
              >
                {t("add")}
              </Button>
              {adding && (
                <EventLanguagePicker
                  uiLocale={uiLocale}
                  existing={content.translations.map(
                    ({ localeCode }) => localeCode,
                  )}
                  onAdd={(code) => choose(code, onAdd)}
                  onCancel={() => {
                    setAdding(false);
                    trigger.current?.focus();
                  }}
                />
              )}
              <p className="text-picker-small leading-[inherit] text-event-display-muted dark:text-gray-300">
                {t("shared")}
              </p>
            </>
          )}
        </div>
      </Dropdown>
    </div>
  );
}
