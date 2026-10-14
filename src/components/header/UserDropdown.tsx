"use client";

import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { DropdownItem } from "@/components/ui/dropdown/DropdownItem";
import { useAuth } from "@/context/AuthContext";
import { useClickOutside } from "@/hooks/useClickOutside";
import { useConfirm } from "@/hooks/useConfirm";
import { languages } from "@/i18n/languages";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { CheckLineIcon, ChevronDownIcon, GlobeIcon } from "@/icons";
import { translateRole } from "@/utils/i18n-labels";
import { useLocale, useTranslations } from "next-intl";
import { useRef, useState } from "react";

export default function UserDropdown() {
  const t = useTranslations("userDropdown");
  const tc = useTranslations("confirm");
  const th = useTranslations("header");
  const tCommon = useTranslations("common");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, isImpersonating, stopImpersonating } = useAuth();
  const { confirm } = useConfirm();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubDropdownOpen, setIsSubDropdownOpen] = useState(false);
  const subDropdownRef = useRef<HTMLLIElement>(null);

  useClickOutside(subDropdownRef, () => {
    setIsSubDropdownOpen(false);
  });

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
    if (isOpen) setIsSubDropdownOpen(false);
  };

  const closeDropdown = () => {
    setIsOpen(false);
    setIsSubDropdownOpen(false);
  };

  const handleSelectLanguage = (id: Locale) => {
    router.replace(pathname, { locale: id });
    setIsSubDropdownOpen(false);
  };

  const handleStopImpersonating = async () => {
    const confirmed = await confirm({
      title: tc("stopImpersonateTitle"),
      message: t("confirmStopImpersonating"),
      confirmLabel: t("stopImpersonating"),
      variant: "warning",
    });
    if (!confirmed) return;
    closeDropdown();
    stopImpersonating();
  };

  const handleSignOut = async () => {
    const confirmed = await confirm({
      title: tc("signOutTitle"),
      message: t("confirmSignOut"),
      confirmLabel: t("signOut"),
      variant: "danger",
    });
    if (!confirmed) return;
    closeDropdown();
    logout();
  };

  if (!user) return null;

  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const label =
    user.role === "super_admin"
      ? th("adminLabel")
      : user.name.split(" ")[0];

  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
        className="dropdown-toggle flex items-center gap-2 rounded-full border border-gray-200 bg-white py-1.5 pe-2.5 ps-1.5 text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-brand-500 text-theme-xs font-semibold text-white">
          {initials}
        </span>
        <span className="hidden text-theme-sm font-medium sm:block">{label}</span>
        <ChevronDownIcon
          className={`size-4 text-gray-500 transition-transform duration-200 dark:text-gray-400 ${isOpen ? "rotate-180" : ""
            }`}
        />
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute mt-3 flex w-65 flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg ltr:end-0 rtl:start-0 dark:border-gray-800 dark:bg-gray-dark"
      >
        <div>
          <span className="block text-theme-sm font-medium text-gray-700 dark:text-gray-400">
            {user.name}
          </span>
          <span className="mt-0.5 block text-theme-xs text-gray-500 dark:text-gray-400">
            {user.email}
          </span>
          <span className="mt-1 block text-theme-xs text-brand-500">
            {translateRole(tCommon, user.role)}
          </span>
        </div>

        <ul className="flex flex-col gap-1 border-b border-gray-200 py-3 dark:border-gray-800">
          <li ref={subDropdownRef} className="relative">
            <DropdownItem
              tag="button"
              onClick={() => setIsSubDropdownOpen((prev) => !prev)}
              className="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-theme-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
            >
              <GlobeIcon className="size-5 shrink-0 text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-200" />
              <span>{t("language")}</span>
              <ChevronDownIcon
                className={`ms-auto size-4 transition-transform ${isSubDropdownOpen ? "rotate-180" : ""
                  }`}
              />
            </DropdownItem>

            {isSubDropdownOpen ? (
              <ul className="mt-1 space-y-1 rounded-lg bg-gray-50 p-1 dark:bg-white/5">
                {languages.map((language) => {
                  const FlagIcon = language.FlagIcon;
                  const isSelected = language.id === locale;
                  return (
                    <li key={language.id}>
                      <button
                        type="button"
                        onClick={() => handleSelectLanguage(language.id)}
                        className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-start text-theme-sm transition-colors ${
                          isSelected
                            ? "bg-white font-medium text-brand-500 shadow-theme-xs dark:bg-white/10 dark:text-white"
                            : "text-gray-700 hover:bg-white dark:text-gray-300 dark:hover:bg-white/10"
                        }`}
                      >
                        <FlagIcon className="size-4 shrink-0 rounded-xs" />
                        <span className="flex-1">{language.name}</span>
                        {isSelected && (
                          <CheckLineIcon className="ms-auto size-4 text-brand-500 dark:text-brand-400" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </li>
        </ul>

        <div className="flex flex-col gap-1 pt-2">
          {isImpersonating ? (
            <DropdownItem
              tag="button"
              onClick={handleStopImpersonating}
              className="group flex items-center gap-3 rounded-lg px-3 py-2 text-theme-sm font-medium text-warning-700 hover:bg-warning-50 dark:text-warning-400 dark:hover:bg-warning-500/10"
            >
              {t("stopImpersonating")}
            </DropdownItem>
          ) : null}
          <DropdownItem
            tag="button"
            onClick={handleSignOut}
            className="group flex items-center gap-3 rounded-lg px-3 py-2 text-theme-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
          >
            {t("signOut")}
          </DropdownItem>
        </div>
      </Dropdown>

    </div>
  );
}
