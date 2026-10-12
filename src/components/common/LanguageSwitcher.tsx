"use client";

import { getLanguage, languages } from "@/i18n/languages";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/utils";
import { useLocale } from "next-intl";

interface LanguageSwitcherProps {
  className?: string;
  compact?: boolean;
}

export default function LanguageSwitcher({
  className,
  compact = false,
}: LanguageSwitcherProps) {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const current = getLanguage(locale);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white p-1 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900",
        className,
      )}
    >
      {languages.map((language) => {
        const FlagIcon = language.FlagIcon;
        const active = language.id === current.id;

        return (
          <button
            key={language.id}
            type="button"
            onClick={() => router.replace(pathname, { locale: language.id })}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-2.5 py-1.5 text-theme-xs font-medium transition",
              active
                ? "bg-brand-500 text-white"
                : "text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5",
            )}
            aria-pressed={active}
          >
            <FlagIcon className="size-4 rounded-sm" />
            {!compact ? <span>{language.shortName}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
