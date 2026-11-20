"use client";

import EventLanguagePicker from "@/components/event/setup/details/EventLanguagePicker";
import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { DropdownItem } from "@/components/ui/dropdown/DropdownItem";
import { contentLanguageName } from "@/core/event/content";
import { useConfirm } from "@/hooks/useConfirm";
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
  onRemove: (code: string) => void;
}

export default function EventLanguageDropdown({
  content,
  selected,
  uiLocale,
  readOnly,
  onSelect,
  onAdd,
  onRemove,
}: EventLanguageDropdownProps) {
  const t = useTranslations("eventHome.details.languages");
  const { confirm } = useConfirm();
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  const close = (restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) trigger.current?.focus({ preventScroll: true });
  };
  const choose = (code: string, change: (value: string) => void) => {
    change(code);
    close(true);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (open && event.key === "Escape" && !event.nativeEvent.isComposing) {
      event.preventDefault();
      event.stopPropagation();
      close(true);
    }
  };
  const triggerLabel = t("trigger", {
    language: contentLanguageName(selected, uiLocale),
  });

  async function removeLanguage(code: string, language: string) {
    close(true);
    if (await confirm({
      appearance: "event",
      variant: "danger",
      title: t("removeTitle", { language }),
      message: t("removeDescription"),
      confirmLabel: t("removeConfirm"),
    })) {
      onRemove(code);
    }
  }

  return (
    <div className="es-content-language" onKeyDown={onKeyDown}>
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-label={triggerLabel}
        onClick={() => (open ? close(true) : setOpen(true))}
        className="es-info-language hover:bg-event-subtle focus-visible:outline-2 focus-visible:outline-event-action sm:w-44! dark:hover:bg-gray-700"
      >
        <LanguageIcon className="size-4.5 shrink-0" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-start">{triggerLabel}</span>
        <ChevronDownIcon className="size-4 shrink-0" aria-hidden="true" />
      </button>
      <Dropdown
        isOpen={open}
        onClose={() => close()}
        triggerRef={trigger}
        className="es-content-language-menu top-full z-50 overflow-y-auto overscroll-contain border-event-display-border p-4 sm:p-5 dark:border-gray-600 dark:bg-gray-900"
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
          <ul
            className="max-h-47 space-y-1 overflow-y-auto overscroll-contain [@media(max-height:35rem)]:max-h-35"
            aria-label={t("added")}
          >
            {content.translations.map(({ localeCode }) => {
              const language = contentLanguageName(localeCode, uiLocale);
              const isDefault = localeCode === content.defaultLocale;
              const active = selected === localeCode;
              const label = t(isDefault ? "defaultEntry" : "entry", {
                language,
                code: localeCode.toUpperCase(),
              });
              return (
                <li
                  key={localeCode}
                  data-active={active}
                  className="flex h-11 items-center rounded-full border border-event-display-border data-[active=true]:border-event-action data-[active=true]:bg-event-subtle dark:border-gray-600 dark:data-[active=true]:border-brand-400 dark:data-[active=true]:bg-gray-800"
                >
                  <DropdownItem
                    pressed={active}
                    onClick={() => choose(localeCode, onSelect)}
                    baseClassName="min-h-10 min-w-0 flex-1 rounded-full px-3 py-1.5 text-start text-portal-label font-semibold text-event-display-text hover:bg-event-subtle focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-event-action dark:text-white/90 dark:hover:bg-gray-800"
                  >
                    <span className="block truncate" title={label}>{label}</span>
                  </DropdownItem>
                  {!readOnly && !isDefault && (
                    <button
                      type="button"
                      aria-label={t("removeLabel", { language })}
                      onClick={() => void removeLanguage(localeCode, language)}
                      className="grid size-10 shrink-0 place-items-center rounded-full text-event-display-muted hover:bg-error-50 hover:text-error-700 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-error-600 dark:text-gray-300 dark:hover:bg-error-950 dark:hover:text-error-300"
                    >
                      <XMarkIcon className="size-4" aria-hidden="true" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          {!readOnly && (
            <EventLanguagePicker
              uiLocale={uiLocale}
              existing={content.translations.map(({ localeCode }) => localeCode)}
              onAdd={(code) => choose(code, onAdd)}
            />
          )}
        </div>
      </Dropdown>
    </div>
  );
}
