"use client";

import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { DropdownItem } from "@/components/ui/dropdown/DropdownItem";
import { useAuth } from "@/context/AuthContext";
import { useConfirm } from "@/hooks/useConfirm";
import { showToast } from "@/utils/alert";
import { translateRole } from "@/utils/i18n-labels";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { useState } from "react";

export default function UserDropdown() {
  const t = useTranslations("userDropdown");
  const tc = useTranslations("confirm");
  const th = useTranslations("header");
  const tCommon = useTranslations("common");
  const { user, logout, isInspectingEvent, stopInspectingEvent } = useAuth();
  const { confirm } = useConfirm();
  const [isOpen, setIsOpen] = useState(false);

  const closeDropdown = () => setIsOpen(false);

  const handleStopInspecting = async () => {
    const confirmed = await confirm({
      title: tc("stopInspectTitle"),
      message: t("confirmStopImpersonating"),
      confirmLabel: t("stopImpersonating"),
      variant: "warning",
    });
    if (!confirmed) return;
    closeDropdown();
    try {
      await stopInspectingEvent();
    } catch {
      showToast({ title: t("stopImpersonatingFailed"), variant: "error" });
    }
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
    try {
      await logout();
    } catch {
      showToast({ title: t("signOutFailed"), variant: "error" });
    }
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
        onClick={() => setIsOpen((prev) => !prev)}
        className="dropdown-toggle flex items-center gap-2 rounded-full border border-gray-200 bg-white py-1.5 pe-2.5 ps-1.5 text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-brand-500 text-theme-xs font-semibold text-white">
          {initials}
        </span>
        <span className="hidden text-theme-sm font-medium sm:block">{label}</span>
        <ChevronDownIcon
          className={`size-4 text-gray-500 transition-transform duration-200 dark:text-gray-400 ${isOpen ? "rotate-180" : ""}`}
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

        <div className="flex flex-col gap-1 border-t border-gray-200 pt-2 dark:border-gray-800">
          {isInspectingEvent ? (
            <DropdownItem
              tag="button"
              onClick={handleStopInspecting}
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
