"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useId, useRef, useState } from "react";
import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { DropdownItem } from "@/components/ui/dropdown/DropdownItem";
import { useAuth } from "@/context/AuthContext";
import { useSidebar } from "@/context/SidebarContext";
import { useConfirm } from "@/hooks/useConfirm";
import { languages } from "@/i18n/languages";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { translateRole } from "@/utils/i18n-labels";
import styles from "./EventWorkspaceChrome.module.css";

export default function EventWorkspaceHeader() {
  const h = useTranslations("header");
  const a = useTranslations("userDropdown");
  const tc = useTranslations("confirm");
  const common = useTranslations("common");
  const { user, isImpersonating, stopImpersonating, logout } = useAuth();
  const { toggleSidebar, toggleMobileSidebar } = useSidebar();
  const { confirm } = useConfirm();
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const accountTrigger = useRef<HTMLButtonElement>(null);

  function changeLanguage(language: string) {
    setOpen(false);
    router.replace(pathname + globalThis.location.search, {
      locale: language as Locale,
    });
  }

  async function leaveAccount(impersonation: boolean) {
    const approved = await confirm({
      title: tc(impersonation ? "stopImpersonateTitle" : "signOutTitle"),
      message: a(impersonation ? "confirmStopImpersonating" : "confirmSignOut"),
      confirmLabel: a(impersonation ? "stopImpersonating" : "signOut"),
      variant: impersonation ? "warning" : "danger",
    });
    if (approved) {
      setOpen(false);
      if (impersonation) stopImpersonating();
      else logout();
    }
  }

  return (
    <header className={styles.header}>
      <button
        type="button"
        className={styles.toggle}
        aria-label={h("toggleSidebar")}
        aria-controls="event-workspace-sidebar"
        onClick={() =>
          globalThis.innerWidth >= 1280
            ? toggleSidebar()
            : toggleMobileSidebar()
        }
      >
        <Image
          src="/images/event-workspace/icon-outline-menu.svg"
          alt=""
          width={20}
          height={20}
        />
      </button>
      <div className={styles.headerActions}>
        <label className={styles.language}>
          <Image
            src="/images/event-workspace/globe-component-instance.svg"
            alt=""
            width={18}
            height={18}
          />
          <span aria-hidden="true">{locale.toUpperCase()}</span>
          <select
            aria-label={a("language")}
            value={locale}
            onChange={(event) => changeLanguage(event.target.value)}
          >
            {languages.map((language) => (
              <option key={language.id} value={language.id}>
                {language.name}
              </option>
            ))}
          </select>
        </label>
        {user && (
          <div
            className="relative"
            onKeyDown={(event) => {
              if (open && event.key === "Escape") {
                setOpen(false);
                accountTrigger.current?.focus();
              }
            }}
          >
            <button
              ref={accountTrigger}
              type="button"
              className={`dropdown-toggle ${styles.account}`}
              aria-controls={open ? menuId : undefined}
              aria-expanded={open}
              aria-label={`${user.name}, ${translateRole(common, user.role)}`}
              onClick={() => setOpen(!open)}
            >
              <span className={styles.avatar} aria-hidden="true">
                {user.name
                  .trim()
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join("")
                  .toUpperCase()}
              </span>
              <span className={styles.identity}>
                <span>{user.name}</span>
                <small>{translateRole(common, user.role)}</small>
              </span>
              <Image
                src="/images/event-workspace/icon-chevron-down.svg"
                alt=""
                width={16}
                height={16}
                className={open ? "rotate-180" : undefined}
              />
            </button>
            <Dropdown
              isOpen={open}
              onClose={() => setOpen(false)}
              className="mt-2 w-65 space-y-1 p-3 dark:text-gray-200"
            >
              <div
                id={menuId}
                className="border-b border-event-border pb-2 dark:border-gray-700"
              >
                <strong className="block truncate text-sm">{user.name}</strong>
                <span className="block truncate text-xs text-participant-muted dark:text-gray-300">
                  {user.email}
                </span>
              </div>
              {isImpersonating && (
                <DropdownItem
                  tag="button"
                  className="rounded-lg text-warning-700 dark:text-warning-400"
                  onClick={() => void leaveAccount(true)}
                >
                  {a("stopImpersonating")}
                </DropdownItem>
              )}
              <DropdownItem
                tag="button"
                className="rounded-lg text-gray-700 dark:text-gray-300"
                onClick={() => void leaveAccount(false)}
              >
                {a("signOut")}
              </DropdownItem>
            </Dropdown>
          </div>
        )}
      </div>
    </header>
  );
}
