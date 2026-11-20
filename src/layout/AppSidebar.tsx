"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { useSidebar } from "@/context/SidebarContext";
import { api } from "@/core/api";
import { getAdminHomePath } from "@/core/auth";
import { isEventReportingPath } from "@/core/event/public-event-paths";
import { Link, usePathname } from "@/i18n/navigation";
import type { EventWorkspace } from "@/types/event/workspace";
import styles from "@/components/event/workspace/EventWorkspaceChrome.module.css";
import {
  ChartPieIcon,
  ClockIcon,
  Squares2X2Icon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

type NavItem = {
  key: string;
  icon: ReactNode;
  path?: string;
  disabled?: boolean;
};

export default function AppSidebar() {
  const t = useTranslations("sidebar");
  const pathname = usePathname();
  const locale = useLocale();
  const {
    user,
    realUser,
    allowAdmin,
    allowEvent,
    inspectedEventId,
    canViewOverview,
    canViewEvents,
    canViewUsers,
    canViewActivity,
  } = useAuth();
  const {
    isDesktop,
    isExpanded,
    isHovered,
    isMobileOpen,
    setIsHovered,
    closeMobileSidebar,
  } = useSidebar();

  const isAdminArea = pathname.startsWith("/admin");
  const isEventArea = pathname === "/event" || pathname.startsWith("/event/");
  const isDashboardPath = isEventReportingPath(pathname);
  const expanded = isExpanded || isHovered || isMobileOpen;

  const dashboardAccessKey =
    allowEvent && isEventArea
      ? JSON.stringify([
          user?.id,
          user?.role,
          realUser?.id,
          inspectedEventId,
          locale,
          pathname,
        ])
      : null;
  const [moduleAccess, setModuleAccess] = useState<{
    key: string;
    dashboard: boolean;
    forms: boolean;
    activity: boolean;
  } | null>(null);

  useEffect(() => {
    if (!dashboardAccessKey) return;
    let current = true;
    api.get<EventWorkspace | null>(`/event/workspace?locale=${locale}`).then(
      (workspace) => {
        if (current) {
          setModuleAccess({
            key: dashboardAccessKey,
            dashboard: workspace?.canAccessDashboard === true,
            forms: workspace?.canAccessForms === true,
            activity: workspace?.canViewActivity === true,
          });
        }
      },
      () => {
        if (current)
          setModuleAccess({
            key: dashboardAccessKey,
            dashboard: false,
            forms: false,
            activity: false,
          });
      },
    );
    return () => {
      current = false;
    };
  }, [dashboardAccessKey, locale]);

  const adminNav: NavItem[] = [
    ...(canViewOverview
      ? [
          {
            key: "overview",
            icon: <Squares2X2Icon className="size-5" />,
            path: "/admin",
          } satisfies NavItem,
        ]
      : []),
    ...(canViewEvents
      ? [
          {
            key: "events",
            icon: <Squares2X2Icon className="size-5" />,
            path: "/admin/events",
          } satisfies NavItem,
        ]
      : []),
    ...(canViewUsers
      ? [
          {
            key: "owners",
            icon: <UserGroupIcon className="size-5" />,
            path: "/admin/users",
          } satisfies NavItem,
        ]
      : []),
    ...(canViewActivity
      ? [
          {
            key: "activity",
            icon: <ClockIcon className="size-5" />,
            path: "/admin/activity",
          } satisfies NavItem,
        ]
      : []),
  ];

  const eventNav: NavItem[] = [
    {
      key: "eventHome",
      icon: <Squares2X2Icon className="size-5" />,
      path: "/event",
    },
  ];

  if (moduleAccess?.key === dashboardAccessKey && moduleAccess.forms) {
    eventNav.push({
      key: "Form",
      icon: <Squares2X2Icon className="size-5" />,
      path: "/event/form",
    });
  }

  if (user?.role === "event_owner") {
    eventNav.push({
      key: "eventTeam",
      icon: <UserGroupIcon className="size-5" />,
      path: "/event/team",
    });
  }

  if (moduleAccess?.key === dashboardAccessKey && moduleAccess.dashboard) {
    eventNav.push({
      key: "dashboard",
      icon: <ChartPieIcon className="size-5" />,
      path: "/event/dashboard",
    });
  }

  if (moduleAccess?.key === dashboardAccessKey && moduleAccess.activity) {
    eventNav.push({
      key: "activity",
      icon: <ClockIcon className="size-5" />,
      path: "/event/activity",
    });
  }

  const navItems = isAdminArea
    ? allowAdmin
      ? adminNav
      : []
    : isEventArea
      ? allowEvent
        ? eventNav
        : []
      : allowAdmin
        ? adminNav
        : allowEvent
          ? eventNav
          : [];

  const homePath = allowAdmin
    ? getAdminHomePath({
        canViewOverview,
        canViewEvents,
        canViewUsers,
        canViewActivity,
      })
    : allowEvent
      ? "/event"
      : "/login";

  const isActive = (path?: string) => {
    if (!path) return false;
    if (path === "/event/dashboard") return isDashboardPath;
    if (path === "/admin" || path === "/event") return pathname === path;
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  function handleNavigation(event: { preventDefault: () => void }, href: string) {
    if (!isMobileOpen) return;

    const isCurrentPage = href === pathname;
    if (isCurrentPage) event.preventDefault();
    closeMobileSidebar(isCurrentPage);
  }

  return (
    <aside
      id="app-sidebar"
      data-expanded={expanded}
      onMouseEnter={() => {
        if (isDesktop && !isExpanded) setIsHovered(true);
      }}
      onMouseLeave={() => setIsHovered(false)}
      className={`${styles.sidebar} ${isMobileOpen ? "visible translate-x-0" : "invisible -translate-x-full xl:visible xl:translate-x-0 rtl:translate-x-full xl:rtl:translate-x-0"}`}
    >
      <Link
        href={homePath}
        onNavigate={(event) => handleNavigation(event, homePath)}
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

      <nav aria-label={t("groups.workspace")}>
        <h2 className={expanded ? styles.section : "sr-only"}>
          {t("groups.workspace")}
        </h2>
        <ul className="space-y-1">
          {navItems.map((item) => {
            const { path } = item;
            const label = t(`items.${item.key}`);
            const active = isActive(item.path);
            const content = (
              <>
                {item.icon}
                {expanded && <span>{label}</span>}
              </>
            );

            return (
              <li key={item.key}>
                {item.disabled || !path ? (
                  <button
                    type="button"
                    disabled
                    className={styles.item}
                    aria-label={label}
                    title={label}
                  >
                    {content}
                  </button>
                ) : (
                  <Link
                    href={path}
                    onNavigate={(event) => handleNavigation(event, path)}
                    className={styles.item}
                    aria-label={label}
                    aria-current={active ? "page" : undefined}
                  >
                    {content}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
