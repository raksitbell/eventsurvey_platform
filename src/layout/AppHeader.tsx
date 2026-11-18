"use client";

import UserDropdown from "@/components/header/UserDropdown";
import { useSidebar } from "@/context/SidebarContext";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import type React from "react";

const AppHeader: React.FC = () => {
  const t = useTranslations("header");
  const { isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar();

  const handleToggle = () => {
    if (window.innerWidth >= 1280) {
      toggleSidebar();
    } else {
      toggleMobileSidebar();
    }
  };

  return (
    <header className="sticky top-0 z-99999 flex w-full border-b border-gray-200 bg-white/90 backdrop-blur dark:border-gray-800 dark:bg-gray-900/90">
      <div className="flex w-full grow items-center gap-3 px-3 py-3 xl:gap-4 xl:px-6 xl:py-4">
        <button
          className={`z-99999 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-500 lg:h-11 lg:w-11 dark:border-gray-800 dark:text-gray-400 ${
            isMobileOpen
              ? "bg-gray-100 dark:bg-white/3"
              : "bg-white dark:bg-gray-900"
          }`}
          onClick={handleToggle}
          aria-label={t("toggleSidebar")}
        >
          {isMobileOpen ? (
            <XMarkIcon className="size-6" />
          ) : (
            <Bars3Icon className="size-5 rtl:-scale-x-100" />
          )}
        </button>

        <div className="ms-auto flex items-center gap-2 sm:gap-3">
          <UserDropdown />
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
