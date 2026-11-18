"use client";
import { Bars3Icon, GlobeAltIcon } from "@heroicons/react/24/outline";
import { useSidebar } from "@/context/SidebarContext";
import UserDropdown from "@/components/header/UserDropdown";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { languages } from "@/i18n/languages";
import type { Locale } from "@/i18n/routing";

export default function EventWorkspaceHeader() {
  const t = useTranslations("header"),
    account = useTranslations("userDropdown");
  const { toggleSidebar, toggleMobileSidebar } = useSidebar();
  const path = usePathname(),
    router = useRouter(),
    locale = useLocale();
  return (
    <header className="sticky top-0 z-99 flex items-center justify-between gap-3 border-b border-event-border bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-900">
      <button
        type="button"
        className="event-option"
        aria-label={t("toggleSidebar")}
        onClick={() =>
          globalThis.innerWidth >= 1280
            ? toggleSidebar()
            : toggleMobileSidebar()
        }
      >
        <Bars3Icon className="size-5" />
      </button>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-1">
          <GlobeAltIcon className="size-4" />
          <select
            className="bg-transparent text-sm dark:bg-gray-900"
            aria-label={account("language")}
            value={locale}
            onChange={(e) =>
              router.replace(path + globalThis.location.search, {
                locale: e.target.value as Locale,
              })
            }
          >
            {languages.map((l) => (
              <option key={l.id} value={l.id}>
                {l.id.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
        <UserDropdown />
      </div>
    </header>
  );
}
