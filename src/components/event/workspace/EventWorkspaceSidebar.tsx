"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { DocumentTextIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import { useSidebar } from "@/context/SidebarContext";
import { isEventReportingPath } from "@/core/event/public-event-paths";
import useEventWorkspace from "@/hooks/useEventWorkspace";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useEventNavigationGuard } from "./EventNavigationGuard";
import styles from "./EventWorkspaceChrome.module.css";

export default function EventWorkspaceSidebar() {
  const { workspace, loading } = useEventWorkspace();
  // Prefer cached/loaded workspace; only treat as empty on the first cold load.
  const currentWorkspace = workspace;
  const menuReady = !loading || currentWorkspace !== null;
  const published =
    !!currentWorkspace?.setup?.publication ||
    !!currentWorkspace?.localPublishedAt ||
    currentWorkspace?.eventStatus === "open" ||
    currentWorkspace?.eventStatus === "closed";
  const t = useTranslations("eventSetup");
  const sidebar = useTranslations("sidebar.items");
  const pathname = usePathname();
  const router = useRouter();
  const navigationGuard = useEventNavigationGuard();
  const { isExpanded, isHovered, isMobileOpen, setIsHovered } = useSidebar();
  const expanded = isExpanded || isHovered || isMobileOpen;

  function guardLink(event: { preventDefault: () => void }, href: string) {
    const confirmLeave = navigationGuard?.current;
    if (!confirmLeave || href === pathname) return;

    event.preventDefault();
    void confirmLeave().then((approved) => {
      if (approved) router.push(href);
    });
  }

  type NavItem = {
    label: string;
    icon: ReactNode;
    href: string | null;
  };
  const items: NavItem[] = !menuReady
    ? []
    : [
        {
          label: t("overview"),
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
          label: sidebar("Form"),
          icon: <DocumentTextIcon className="size-5" aria-hidden="true" />,
          href: "/event/form",
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
        ...(currentWorkspace?.canAccessDashboard
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
                href: "/event/dashboard",
              },
            ]
          : []),
        ...(published && currentWorkspace?.userRole === "event_owner"
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
  const activeHref = (() => {
    if (isEventReportingPath(pathname)) return "/event/dashboard";
    // Form home + builder nested routes share the Form nav item.
    if (pathname === "/event/form" || pathname.startsWith("/event/form/")) {
      return "/event/form";
    }
    const match = items
      .filter((item): item is NavItem & { href: string } => Boolean(item.href))
      .filter(
        (item) =>
          pathname === item.href ||
          // Keep `/event` exact-only so nested workspace routes do not highlight Overview.
          (item.href !== "/event" && pathname.startsWith(`${item.href}/`)),
      )
      .sort((a, b) => b.href.length - a.href.length)[0];
    return match?.href ?? "/event";
  })();

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
      <Link
        href="/event"
        onNavigate={(event) => guardLink(event, "/event")}
        className={styles.brand}
        aria-label="EventSurvey"
      >
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
      <nav aria-label={t("overview")} aria-busy={!menuReady}>
        <h2 className={expanded ? styles.section : "sr-only"}>WORKSPACE</h2>
        <ul className="space-y-1">
          {!menuReady
            ? Array.from({ length: 5 }, (_, index) => (
                <li key={`workspace-nav-skeleton-${index}`}>
                  <div
                    className={`${styles.item} pointer-events-none opacity-40`}
                    aria-hidden="true"
                  >
                    <span className="size-5 shrink-0 rounded bg-white/25" />
                    {expanded && (
                      <span className="h-3 w-24 rounded bg-white/20" />
                    )}
                  </div>
                </li>
              ))
            : items.map(({ label, icon, href }) => {
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
                        onNavigate={(event) => guardLink(event, href)}
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
