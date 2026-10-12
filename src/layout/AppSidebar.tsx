"use client";

import { useAuth } from "@/context/AuthContext";
import { useSidebar } from "@/context/SidebarContext";
import { GridIcon, GroupIcon, HorizontaLDots } from "@/icons";
import { Link, usePathname } from "@/i18n/navigation";
import { canAccessAdmin, canAccessEvent } from "@/core/auth";
import { cn } from "@/utils";
import { useTranslations } from "next-intl";

type NavItem = {
  key: string;
  icon: React.ReactNode;
  path?: string;
  disabled?: boolean;
};

export default function AppSidebar() {
  const t = useTranslations("sidebar");
  const pathname = usePathname();
  const { user } = useAuth();
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();

  const isAdminArea = pathname.startsWith("/admin");
  const showExpanded = isExpanded || isHovered || isMobileOpen;

  const adminNav: NavItem[] = [
    { key: "overview", icon: <GridIcon />, path: "/admin" },
    { key: "owners", icon: <GroupIcon />, path: "/admin/users" },
  ];

  const eventNav: NavItem[] = [
    { key: "eventHome", icon: <GridIcon />, path: "/event" },
  ];

  const navItems =
    isAdminArea && user && canAccessAdmin(user.role)
      ? adminNav
      : user && canAccessEvent(user.role)
        ? eventNav
        : user && canAccessAdmin(user.role)
          ? adminNav
          : eventNav;

  const homePath =
    user && canAccessAdmin(user.role)
      ? "/admin"
      : user && canAccessEvent(user.role)
        ? "/event"
        : "/login";

  const isActive = (path?: string) => {
    if (!path) return false;
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
    user?.role === "super_admin"
      ? t("roles.systemOwner")
      : user?.email ?? "";

  return (
    <aside
      className={cn(
        "fixed top-0 z-99999 flex h-screen flex-col bg-gray-950 px-4 text-white transition-all duration-300 ease-in-out",
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
              "mb-3 flex px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500",
              !showExpanded ? "xl:justify-center" : "justify-start",
            )}
          >
            {showExpanded ? t("groups.workspace") : <HorizontaLDots />}
          </h2>

          <ul className="flex flex-col gap-1.5">
            {navItems.map((item) => {
              const active = isActive(item.path);
              const className = cn(
                "group flex w-full items-center gap-3 rounded-full px-3 py-2.5 text-theme-sm font-medium transition",
                active
                  ? "bg-brand-500 text-white"
                  : "text-gray-400 hover:bg-white/5 hover:text-white",
                item.disabled && "cursor-not-allowed opacity-45 hover:bg-transparent hover:text-gray-400",
                !showExpanded && "justify-center px-0",
              );

              if (item.disabled || !item.path) {
                return (
                  <li key={item.key}>
                    <span className={className} title={t(`items.${item.key}`)}>
                      <span className="flex size-5 items-center justify-center [&_svg]:size-5">
                        {item.icon}
                      </span>
                      {showExpanded ? <span>{t(`items.${item.key}`)}</span> : null}
                    </span>
                  </li>
                );
              }

              return (
                <li key={item.key}>
                  <Link href={item.path} className={className}>
                    <span className="flex size-5 items-center justify-center [&_svg]:size-5">
                      {item.icon}
                    </span>
                    {showExpanded ? <span>{t(`items.${item.key}`)}</span> : null}
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
          <div className={cn("flex items-center gap-3", !showExpanded && "justify-center")}>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-500 text-theme-sm font-semibold text-white">
              {initials}
            </span>
            {showExpanded ? (
              <div className="min-w-0">
                <p className="truncate text-theme-sm font-medium text-white">
                  {roleLabel}
                </p>
                <p className="truncate text-theme-xs text-gray-400">{roleHint}</p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </aside>
  );
}
