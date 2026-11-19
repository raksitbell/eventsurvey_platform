"use client";

import AuthGuard from "@/components/auth/AuthGuard";
import ImpersonationBanner from "@/components/auth/ImpersonationBanner";
import { useSidebar } from "@/context/SidebarContext";
import { isEventReportingPath } from "@/core/event/public-event-paths";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import EventNavigationGuardProvider, {
  useEventNavigationGuard,
} from "@/components/event/workspace/EventNavigationGuard";
import EventWorkspaceSidebar from "@/components/event/workspace/EventWorkspaceSidebar";
import EventWorkspaceHeader from "@/components/event/workspace/EventWorkspaceHeader";
import activityChrome from "@/components/event/workspace/EventWorkspaceChrome.module.css";
import { usePathname } from "@/i18n/navigation";
import Backdrop from "@/layout/Backdrop";
import React from "react";
import {
  eventInter,
  eventThai,
} from "@/components/event/setup/event-admin-fonts";
import "@/components/event/setup/event-admin-design.css";
import { cn } from "@/utils";

function EventShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const navigationGuard = useEventNavigationGuard();
  const isActivity = pathname === "/event/activity";
  const isSetup = [
    "/event",
    "/event/details",
    "/event/branding",
    "/event/forms",
    "/event/publish",
    "/event/qr",
    "/event/team",
    "/event/whitelist",
    "/event/setup/registration",
    "/event/setup/survey",
  ].includes(pathname);
  const usesWorkspaceChrome =
    isActivity || isSetup || isEventReportingPath(pathname);
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

  // Must match AppSidebar dock breakpoint (`xl`). Using `lg` left a gap
  // between 1024–1279px where the sidebar is off-canvas but content still indented.
  const mainContentMargin = isMobileOpen
    ? "ms-0"
    : isExpanded || isHovered
      ? "xl:ms-[280px]"
      : "xl:ms-[90px]";

  return (
    <>
      <div
        className={cn(
          "min-h-screen xl:flex dark:bg-gray-950",
          usesWorkspaceChrome
            ? [eventInter.variable, eventThai.variable, "event-admin-shell"]
            : "bg-gray-50",
          isActivity && activityChrome.activityShell,
        )}
      >
        {usesWorkspaceChrome ? <EventWorkspaceSidebar /> : <AppSidebar />}
        <Backdrop />
        <div
          data-screen={isSetup ? pathname : undefined}
          className={cn(
            "flex min-h-screen min-w-0 flex-1 flex-col",
            isActivity
              ? "xl:transition-[margin-inline-start] xl:duration-300 xl:ease-in-out"
              : "transition-all duration-300 ease-in-out",
            mainContentMargin,
            isSetup && "event-admin-main",
          )}
        >
          <ImpersonationBanner
            beforeLeave={() => navigationGuard?.current?.() ?? true}
          />
          {usesWorkspaceChrome ? <EventWorkspaceHeader /> : <AppHeader />}
          <div
            className={
              isSetup
                ? "event-admin-body"
                : isActivity
                  ? activityChrome.activityBody
                  : "mx-auto w-full max-w-(--breakpoint-2xl) flex-1 p-4 md:p-6"
            }
          >
            {children}
          </div>
        </div>
      </div>
    </>
  );
}

export default function EventLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard area="event">
      <EventNavigationGuardProvider>
        <EventShell>{children}</EventShell>
      </EventNavigationGuardProvider>
    </AuthGuard>
  );
}
