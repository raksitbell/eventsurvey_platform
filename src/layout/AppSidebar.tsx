"use client";

import { useAuth } from "@/context/AuthContext";
import { useSidebar } from "@/context/SidebarContext";
import { api } from "@/core/api";
import { canEnterAdminArea, canEnterEventArea } from "@/core/auth";
import { Link, usePathname } from "@/i18n/navigation";
import type { EventWorkspace } from "@/types/event/workspace";
import dashboardTheme from "@/components/event/reports/dashboard-theme.module.css";
import { cn } from "@/utils";
import {
  ChartPieIcon,
  EllipsisHorizontalIcon,
  Squares2X2Icon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type React from "react";

type NavItem = {
  key: string;
  icon: React.ReactNode;
  path?: string;
  disabled?: boolean;
};

const dashboardPaths = [
  "/event/dashboard",
  "/event/responses",
  "/event/exports",
  "/event/trash",
  "/event/analytics",
];

export default function AppSidebar() {
  const t = useTranslations("sidebar");
  const pathname = usePathname();
  const locale = useLocale();
  const { user, realUser, isImpersonating } = useAuth();
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();

  const isAdminArea = pathname.startsWith("/admin");
  const isEventArea = pathname === "/event" || pathname.startsWith("/event/");
  const isFormArea = pathname === "/form" || pathname.startsWith("/form/");
  const isDashboardPath = dashboardPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
  const showExpanded = isExpanded || isHovered || isMobileOpen;

  const allowAdmin = canEnterAdminArea(realUser?.role, isImpersonating);
  const allowEvent = canEnterEventArea(
    user?.role,
    realUser?.role,
    isImpersonating,
  );

  const dashboardAccessKey =
    allowEvent && (isEventArea || isFormArea)
      ? JSON.stringify([
          user?.id,
          user?.role,
          realUser?.id,
          isImpersonating,
          locale,
          pathname,
        ])
      : null;
  const [dashboardAccess, setDashboardAccess] = useState<{
    key: string;
    allowed: boolean;
  } | null>(null);

  useEffect(() => {
    if (!dashboardAccessKey) return;
    let current = true;
    api.get<EventWorkspace | null>(`/event/workspace?locale=${locale}`).then(
      (workspace) => {
        if (current) {
          setDashboardAccess({
            key: dashboardAccessKey,
            allowed: workspace?.canAccessDashboard === true,
          });
        }
      },
      () => {
        if (current)
          setDashboardAccess({ key: dashboardAccessKey, allowed: false });
      },
    );
    return () => {
      current = false;
    };
  }, [dashboardAccessKey, locale]);

  const adminNav: NavItem[] = [
    { key: "overview", icon: <Squares2X2Icon />, path: "/admin" },
    { key: "events", icon: <Squares2X2Icon />, path: "/admin/events" },
    { key: "owners", icon: <UsersIcon />, path: "/admin/users" },
  ];

  const eventNav: NavItem[] = [
    { key: "eventHome", icon: <Squares2X2Icon />, path: "/event" },
    { key: "Form", icon: <Squares2X2Icon />, path: "/form" },
  ];

  if (dashboardAccess?.key === dashboardAccessKey && dashboardAccess?.allowed) {
    eventNav.push({
      key: "dashboard",
      icon: <ChartPieIcon />,
      path: "/event/dashboard",
    });
  }

  const navItems = isAdminArea
    ? allowAdmin
      ? adminNav
      : []
    : isEventArea || isFormArea
      ? allowEvent
        ? eventNav
        : []
      : allowAdmin
        ? adminNav
        : allowEvent
          ? eventNav
          : [];

  const homePath = allowAdmin ? "/admin" : allowEvent ? "/event" : "/login";

  const isActive = (path?: string) => {
    if (!path) return false;
    if (path === "/event/dashboard") return isDashboardPath;
    if (path === "/admin" || path === "/event") return pathname === path;
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "ES";

  const roleLabel =
    user?.role === "super_admin"
      ? t("roles.superAdmin")
      : user?.role === "event_owner"
        ? t("roles.eventOwner")
        : user?.role === "sub_user"
          ? t("roles.subUser")
          : user?.role;

  const roleHint =
    user?.role === "super_admin" ? t("roles.systemOwner") : (user?.email ?? "");

  return (
    <aside
      className={cn(
        "fixed top-0 z-99999 flex h-screen flex-col bg-gray-950 px-4 text-white transition-all duration-300 ease-in-out",
        isDashboardPath && allowEvent && dashboardTheme.sidebar,
        showExpanded ? "w-[280px]" : "w-[90px]",
        isMobileOpen ? "translate-x-0" : "-translate-x-full xl:translate-x-0",
        "rtl:translate-x-full xl:rtl:translate-x-0",
        isMobileOpen && "rtl:translate-x-0",
      )}
      onMouseEnter={() => {
        if (!isExpanded) setIsHovered(true);
      }}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={cn(
          "flex items-center gap-3 py-7",
          !showExpanded ? "xl:justify-center" : "justify-start",
        )}
      >
        <Link href={homePath} className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-base font-bold text-white">
            E
          </span>
          {showExpanded ? (
            <span className="text-sm font-semibold tracking-[0.18em] text-white">
              EVENTSURVEY
            </span>
          ) : null}
        </Link>
      </div>

      <div className="no-scrollbar flex flex-1 flex-col overflow-y-auto pb-6">
        <div className="mb-3">
          <h2
            className={cn(
              "mb-3 flex px-3 text-[11px] font-semibold tracking-[0.16em] uppercase",
              isDashboardPath ? "text-brand-200" : "text-gray-500",
              !showExpanded ? "xl:justify-center" : "justify-start",
            )}
          >
            {showExpanded ? t("groups.workspace") : <EllipsisHorizontalIcon />}
          </h2>

          <ul className="flex flex-col gap-1.5">
            {navItems.map((item) => {
              const active = isActive(item.path);
              const className = cn(
                "group flex w-full items-center gap-3 rounded-full px-3 py-2.5 text-theme-sm font-medium transition",
                active
                  ? "bg-brand-500 text-white"
                  : isDashboardPath
                    ? "text-brand-50 hover:bg-white/10"
                    : "text-gray-400 hover:bg-white/5 hover:text-white",
                item.disabled &&
                  "cursor-not-allowed opacity-45 hover:bg-transparent hover:text-gray-400",
                !showExpanded && "justify-center px-0",
              );

              if (item.disabled || !item.path) {
                return (
                  <li key={item.key}>
                    <span className={className} title={t(`items.${item.key}`)}>
                      <span className="flex size-5 items-center justify-center [&_svg]:size-5">
                        {item.icon}
                      </span>
                      {showExpanded ? (
                        <span>{t(`items.${item.key}`)}</span>
                      ) : null}
                    </span>
                  </li>
                );
              }

              return (
                <li key={item.key}>
                  <Link
                    href={item.path}
                    className={className}
                    aria-current={active ? "page" : undefined}
                    aria-label={t(`items.${item.key}`)}
                  >
                    <span className="flex size-5 items-center justify-center [&_svg]:size-5">
                      {item.icon}
                    </span>
                    {showExpanded ? (
                      <span>{t(`items.${item.key}`)}</span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {user ? (
        <div
          className={cn(
            "mb-5 rounded-2xl border border-white/10 bg-white/5 p-3",
            !showExpanded && "flex justify-center p-2",
          )}
        >
          <div
            className={cn(
              "flex items-center gap-3",
              !showExpanded && "justify-center",
            )}
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-500 text-theme-sm font-semibold text-white">
              {initials}
            </span>
            {showExpanded ? (
              <div className="min-w-0">
                <p className="truncate text-theme-sm font-medium text-white">
                  {roleLabel}
                </p>
                <p className="truncate text-theme-xs text-gray-400">
                  {roleHint}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </aside>
  );
}
