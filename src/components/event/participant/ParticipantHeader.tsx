"use client";

import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { languages } from "@/i18n/languages";
import { usePathname, useRouter } from "@/i18n/navigation";
import { GlobeAltIcon } from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import { useId, useRef, useState } from "react";
import type { ParticipantDevice } from "@/types/event/participant";
import type { EventBranding } from "@/types/event/branding";

interface ParticipantHeaderProps {
  logo: EventBranding["logo"];
  device: ParticipantDevice;
  readOnly?: boolean;
}
export default function ParticipantHeader({
  logo,
  device,
  readOnly = false,
}: ParticipantHeaderProps) {
  const t = useTranslations("participantEvent");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <header className="flex min-h-20 shrink-0 items-center justify-between gap-2 bg-(--participant-primary) px-6 py-4 text-(--participant-on-primary) @4xl/participant:px-4 dark:bg-(--participant-primary) dark:text-(--participant-on-primary)">
      <div className="flex min-w-0 items-center gap-3">
        {logo ? (
          <Image
            src={logo.url}
            alt={t("logo")}
            width={40}
            height={40}
            unoptimized
            className="size-10 shrink-0 rounded-preview-control bg-white object-contain dark:bg-white"
          />
        ) : (
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-preview-control bg-white text-xl font-bold text-black dark:bg-white dark:text-black"
            aria-hidden="true"
          >
            E
          </span>
        )}
        <div className="min-w-0">
          <p className="text-xl font-bold">EventSurvey</p>
          <p className="text-theme-xs">{t("tagline")}</p>
        </div>
      </div>
      <div
        className="relative shrink-0"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            trigger.current?.focus();
          }
        }}
      >
        <button
          type="button"
          disabled={readOnly}
          ref={trigger}
          aria-label={t("language")}
          aria-expanded={open}
          aria-controls={open ? menuId : undefined}
          onClick={() => setOpen((value) => !value)}
          className="dropdown-toggle flex items-center gap-1 rounded-lg px-2 py-1 text-base text-(--participant-on-primary) hover:bg-white/10 dark:text-(--participant-on-primary) dark:hover:bg-white/10"
        >
          <GlobeAltIcon className="size-4.5" aria-hidden="true" />
          {locale.toUpperCase()}
        </button>
        <Dropdown
          isOpen={open}
          onClose={() => setOpen(false)}
          className="end-0 top-full min-w-32 p-1"
        >
          <div id={menuId} className="space-y-1">
            {languages.map((language) => (
              <button
                key={language.id}
                type="button"
                aria-pressed={locale === language.id}
                onClick={() => {
                  setOpen(false);
                  router.replace(
                    pathname === "/preview/event"
                      ? `${pathname}?device=${device}`
                      : pathname,
                    { locale: language.id },
                  );
                }}
                className="block w-full rounded-lg px-3 py-2 text-start text-theme-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                {language.shortName}
              </button>
            ))}
          </div>
        </Dropdown>
      </div>
    </header>
  );
}
