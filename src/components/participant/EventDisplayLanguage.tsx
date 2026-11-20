"use client";

import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { languages } from "@/i18n/languages";
import { usePathname, useRouter } from "@/i18n/navigation";
import { GlobeAltIcon } from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";
import { useId, useRef, useState } from "react";

export default function EventDisplayLanguage() {
  const locale = useLocale();
  const t = useTranslations("participantEvent");
  const pathname = usePathname();
  const router = useRouter();
  const menuId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`participant-language relative shrink-0 ${open ? "z-50" : ""}`}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (open && event.key === "Escape") {
          setOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      {open && <div aria-hidden="true" className="fixed inset-0 bg-black/50" />}
      <button
        ref={trigger}
        type="button"
        aria-label={t("language")}
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen(!open)}
        className="relative inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg bg-white px-2 font-semibold text-(--display-text) hover:bg-(--display-tint)"
      >
        <GlobeAltIcon className="size-5" aria-hidden="true" />
        {locale.toUpperCase()}
      </button>
      <Dropdown
        isOpen={open}
        onClose={() => setOpen(false)}
        triggerRef={trigger}
        className="end-0 top-full min-w-32 p-1"
      >
        <div id={menuId} role="group" aria-label={t("language")}>
          {languages.map((language) => (
            <button
              key={language.id}
              type="button"
              lang={language.id}
              aria-pressed={locale === language.id}
              onClick={() => {
                setOpen(false);
                trigger.current?.focus();
                if (locale !== language.id) {
                  const href = pathname + globalThis.location.search + globalThis.location.hash;
                  router.replace(href, {
                    locale: language.id,
                    scroll: false,
                  });
                }
              }}
              className="block min-h-11 w-full rounded-lg px-3 text-start text-gray-800 hover:bg-gray-100 aria-pressed:font-semibold dark:text-white dark:hover:bg-gray-800"
            >
              {language.name}
            </button>
          ))}
        </div>
      </Dropdown>
    </div>
  );
}
