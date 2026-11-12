"use client";

import AuthGuard from "@/components/auth/AuthGuard";
import ImpersonationBanner from "@/components/auth/ImpersonationBanner";
import { useSidebar } from "@/context/SidebarContext";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import React from "react";

export default function EventLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

  // Must match AppSidebar dock breakpoint (`xl`). Using `lg` left a gap
  // between 1024–1279px where the sidebar is off-canvas but content still indented.
  const mainContentMargin = isMobileOpen
    ? "ms-0"
    : isExpanded || isHovered
      ? "xl:ms-[280px]"
      : "xl:ms-[90px]";

  return (
    <AuthGuard area="event">
      <div className="min-h-screen bg-gray-50 xl:flex dark:bg-gray-950">
        <AppSidebar />
        <Backdrop />
        <div
          className={`flex min-h-screen min-w-0 flex-1 flex-col transition-all duration-300 ease-in-out ${mainContentMargin}`}
        >
          <ImpersonationBanner />
          <AppHeader />
          <div className="mx-auto w-full max-w-(--breakpoint-2xl) flex-1 p-4 md:p-6">
            {children}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
