"use client";

import AuthGuard from "@/components/auth/AuthGuard";
import ImpersonationBanner from "@/components/auth/ImpersonationBanner";
import {
  eventInter,
  eventThai,
} from "@/components/event/setup/event-admin-fonts";
import activityChrome from "@/components/event/workspace/EventWorkspaceChrome.module.css";
import EventWorkspaceHeader from "@/components/event/workspace/EventWorkspaceHeader";
import { useSidebar } from "@/context/SidebarContext";
import { usePathname } from "@/i18n/navigation";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import { cn } from "@/utils";
import React from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const usesActivityChrome = usePathname() === "/admin/activity";
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

  // Must match AppSidebar dock breakpoint (`xl`). Using `lg` left a gap
  // between 1024–1279px where the sidebar is off-canvas but content still indented.
  const mainContentMargin = isMobileOpen
    ? "ms-0"
    : isExpanded || isHovered
      ? "xl:ms-[280px]"
      : "xl:ms-[90px]";

  return (
    <AuthGuard area="admin">
      <div
        className={cn(
          "min-h-screen xl:flex",
          usesActivityChrome
            ? [
                activityChrome.activityShell,
                eventInter.variable,
                eventThai.variable,
              ]
            : "bg-gray-50 dark:bg-gray-950",
        )}
      >
        <AppSidebar workspaceChrome={usesActivityChrome} />
        <Backdrop />
        <div
          className={cn(
            "flex min-h-screen flex-1 flex-col",
            usesActivityChrome
              ? "min-w-0 xl:transition-[margin-inline-start] xl:duration-300 xl:ease-in-out"
              : "transition-all duration-300 ease-in-out",
            mainContentMargin,
          )}
        >
          <ImpersonationBanner />
          {usesActivityChrome ? (
            <EventWorkspaceHeader sidebarId="app-sidebar" />
          ) : (
            <AppHeader />
          )}
          <div
            className={
              usesActivityChrome
                ? activityChrome.activityBody
                : "mx-auto w-full max-w-(--breakpoint-2xl) flex-1 p-4 md:p-6"
            }
          >
            {children}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
