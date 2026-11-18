"use client";

import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { DropdownItem } from "@/components/ui/dropdown/DropdownItem";
import { useModal } from "@/hooks/useModal";
import { getLanguage, languages } from "@/i18n/languages";
import type { Locale } from "@/i18n/routing";
import { CheckIcon } from "@heroicons/react/24/outline";
import { useId, useRef, type ReactNode } from "react";

interface Props {
  label: string;
  value: Locale;
  onChange: (locale: Locale) => void;
  onOpen?: () => void;
  className: string;
  children: ReactNode;
}

export default function EventLanguageDropdown({
  label,
  value,
  onChange,
  onOpen,
  className,
  children,
}: Props) {
  const { isOpen, toggleModal, closeModal } = useModal();
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();

  function closeAndFocus() {
    closeModal();
    trigger.current?.focus();
  }

  return (
    <div
      className="relative shrink-0"
      onBlur={(event) => {
        if (isOpen && !event.currentTarget.contains(event.relatedTarget)) {
          closeModal();
        }
      }}
      onKeyDown={(event) => {
        if (isOpen && event.key === "Escape") {
          event.stopPropagation();
          closeAndFocus();
        }
      }}
    >
      <button
        ref={trigger}
        type="button"
        className={className}
        aria-label={label}
        aria-describedby={`${id}-value`}
        aria-expanded={isOpen}
        aria-controls={isOpen ? id : undefined}
        onClick={() => {
          if (!isOpen) onOpen?.();
          toggleModal();
        }}
      >
        {children}
      </button>
      <span id={`${id}-value`} className="sr-only">
        {getLanguage(value).name}
      </span>
      <Dropdown
        isOpen={isOpen}
        onClose={closeModal}
        triggerRef={trigger}
        className="top-full w-36 max-w-[calc(100vw-2rem)] p-1"
      >
        <div id={id} role="group" aria-label={label}>
          {languages.map((language) => (
            <DropdownItem
              key={language.id}
              pressed={language.id === value}
              baseClassName="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-start text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
              onClick={() => {
                closeAndFocus();
                if (language.id !== value) onChange(language.id);
              }}
            >
              {language.name}
              {language.id === value && (
                <CheckIcon
                  className="size-4 shrink-0 text-event-action dark:text-brand-300"
                  aria-hidden="true"
                />
              )}
            </DropdownItem>
          ))}
        </div>
      </Dropdown>
    </div>
  );
}
