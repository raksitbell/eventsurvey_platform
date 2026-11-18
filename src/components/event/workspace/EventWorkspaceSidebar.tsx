"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { UserGroupIcon } from "@heroicons/react/24/outline";
import { useSidebar } from "@/context/SidebarContext";
import useEventWorkspace from "@/hooks/useEventWorkspace";
import { Link, usePathname } from "@/i18n/navigation";
import styles from "./EventWorkspaceChrome.module.css";

export default function EventWorkspaceSidebar() {
  const { workspace } = useEventWorkspace();
  const published =
    !!workspace?.localPublishedAt ||
    workspace?.eventStatus === "open" ||
    workspace?.eventStatus === "closed";
  const t = useTranslations("eventSetup");
  const pathname = usePathname();
  const { isExpanded, isHovered, isMobileOpen, setIsHovered } = useSidebar();
  const expanded = isExpanded || isHovered || isMobileOpen;
  const items = [
    {
      label: published ? "Overview" : t("overview"),
      icon: (
        <Image
          src="/images/event-workspace/frame.svg"
          width={20}
          height={20}
          alt=""
        />
      ),
      href: "/event",
    },
    {
      label: t("activity"),
      icon: (
        <Image
          src="/images/event-workspace/heroicon.svg"
          width={20}
          height={20}
          alt=""
        />
      ),
      href: null,
    },
    ...(published
      ? [
          {
            label: t("dashboard"),
            icon: (
              <Image
                src="/images/event-workspace/dashboard-nav.svg"
                width={20}
                height={20}
                alt=""
              />
            ),
            href: null,
          },
        ]
      : []),
    ...(published && workspace?.userRole === "event_owner"
      ? [
          {
            label: t("qrTitle"),
            icon: (
              <Image
                src="/images/event-workspace/qr-nav.svg"
                width={20}
                height={20}
                alt=""
              />
            ),
            href: "/event/qr",
          },
          {
            label: t("team"),
            icon: <UserGroupIcon className="size-5" aria-hidden="true" />,
            href: "/event/team",
          },
        ]
      : []),
  ];
  const activeHref =
    items.find(({ href }) => href === pathname)?.href ?? "/event";

  return (
    <aside
      id="event-workspace-sidebar"
      data-expanded={expanded}
      onMouseEnter={() => {
        if (!isExpanded) setIsHovered(true);
      }}
      onMouseLeave={() => setIsHovered(false)}
      className={`${styles.sidebar} ${isMobileOpen ? "visible translate-x-0" : "invisible -translate-x-full xl:visible xl:translate-x-0 rtl:translate-x-full xl:rtl:translate-x-0"}`}
    >
      <Link href="/event" className={styles.brand} aria-label="EventSurvey">
        <span className={styles.mark}>
          <Image
            alt=""
            width={27}
            height={26}
            src="/images/event-workspace/ticket-speech-symbol.svg"
          />
        </span>
        {expanded && (
          <span className={styles.wordmark}>
            <strong>EventSurvey</strong>
            <small>{t("appSubtitle")}</small>
          </span>
        )}
      </Link>
      <nav aria-label={t("overview")}>
        <h2 className={expanded ? styles.section : "sr-only"}>WORKSPACE</h2>
        <ul>
          {items.map(({ label, icon, href }) => {
            const content = (
              <>
                {icon}
                {expanded && <span>{label}</span>}
              </>
            );
            return (
              <li key={label}>
                {href ? (
                  <Link
                    className={styles.item}
                    href={href}
                    aria-label={label}
                    aria-current={href === activeHref ? "page" : undefined}
                  >
                    {content}
                  </Link>
                ) : (
                  <button
                    type="button"
                    disabled
                    className={styles.item}
                    aria-label={label}
                  >
                    {content}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
