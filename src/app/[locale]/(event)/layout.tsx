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
import { formCanvasStyle } from "@/components/event/form/form-canvas-style";
import { usePathname } from "@/i18n/navigation";
import Backdrop from "@/layout/Backdrop";
import type { ReactNode } from "react";
import useEventWorkspace from "@/hooks/useEventWorkspace";
import {
  eventInter,
  eventThai,
} from "@/components/event/setup/event-admin-fonts";
import "@/components/event/setup/event-admin-design.css";

function EventShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { workspace, loading, userId, locale } = useEventWorkspace();
  const navigationGuard = useEventNavigationGuard();
  const isSetup = [
    "/event",
    "/event/details",
    "/event/branding",
    "/event/forms",
    "/event/publish",
    "/event/qr",
    "/event/team",
    "/event/activity",
    "/event/whitelist",
    "/event/setup/registration",
    "/event/setup/survey",
  ].includes(pathname);
  const isFormPage =
    pathname === "/event/form" || pathname.startsWith("/event/form/");
  const isFormBuilder = /^\/event\/(form|setup)\/(registration|survey)$/.test(pathname);
  const usesSetupChrome = isSetup || isFormPage;
  const featureLayout = isEventReportingPath(pathname) ? "dashboard" : undefined;
  const usesWorkspaceChrome = usesSetupChrome || !!featureLayout;
  const setupTheme = usesSetupChrome
    ? `${eventInter.variable} ${eventThai.variable} event-admin-shell`
    : "";
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  // Must match AppSidebar dock breakpoint (`xl`). Using `lg` left a gap
  // between 1024–1279px where the sidebar is off-canvas but content still indented.
  const mainContentMargin = isMobileOpen
    ? "ms-0"
    : isExpanded || isHovered
      ? "xl:ms-[280px]"
      : "xl:ms-[90px]";

  return (
    <div
      className={`min-h-screen xl:flex dark:bg-gray-950 ${setupTheme} ${isSetup ? "" : "bg-gray-50"}`}
    >
      {usesWorkspaceChrome ? (
        <EventWorkspaceSidebar featureLayout={featureLayout} workspace={workspace} loading={loading} />
      ) : (
        <AppSidebar />
      )}
      <div
        data-screen={isSetup ? pathname : undefined}
        className={`event-workspace-main flex min-h-screen min-w-0 flex-1 flex-col transition-all duration-300 ease-in-out ${mainContentMargin} ${isSetup ? "event-admin-main" : ""}`}
      >
        <Backdrop />
        <ImpersonationBanner
          beforeLeave={() => navigationGuard?.current?.() ?? true}
        />
        {usesWorkspaceChrome ? (
          <EventWorkspaceHeader featureLayout={!!featureLayout} />
        ) : (
          <AppHeader />
        )}
        <div
          style={workspace && isFormBuilder ? formCanvasStyle(workspace, locale, userId) : undefined}
          className={
            isSetup
              ? "event-admin-body"
              : "mx-auto w-full max-w-(--breakpoint-2xl) flex-1 p-4 md:p-6"
          }
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export default function EventLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AuthGuard area="event">
      <EventNavigationGuardProvider>
        <EventShell>{children}</EventShell>
      </EventNavigationGuardProvider>
    </AuthGuard>
  );
}
