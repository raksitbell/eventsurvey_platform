"use client";

import ErrorPage from "@/components/common/ErrorPage";
import Skeleton from "@/components/ui/skeleton/Skeleton";
import { useAuth } from "@/context/AuthContext";
import {
  canEnterAdminArea,
  canEnterEventArea,
  getAdminHomePath,
  getHomePathForRole,
} from "@/core/auth";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import type React from "react";
import { useEffect } from "react";

type GuardArea = "admin" | "event" | "guest";

interface AuthGuardProps {
  area: GuardArea;
  children: React.ReactNode;
}

function HoldScreen() {
  return (
    <div
      className="flex min-h-dvh items-center justify-center bg-white dark:bg-gray-900"
      aria-busy="true"
    >
      <div className="w-full max-w-sm space-y-4 px-6">
        <Skeleton className="mx-auto h-8 w-40" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-11 w-full rounded-lg" />
      </div>
    </div>
  );
}

function isAdminOverviewPath(pathname: string): boolean {
  return pathname === "/admin" || pathname === "/admin/";
}

export default function AuthGuard({ area, children }: AuthGuardProps) {
  const {
    user,
    realUser,
    isImpersonating,
    inspectedEventId,
    isLoading,
    authUnavailable,
    canViewOverview,
    canViewEvents,
    canViewUsers,
    canViewActivity,
  } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("errors.403");

  const homePath = user
    ? getHomePathForRole(user.role, {
        canViewOverview,
        canViewEvents,
        canViewUsers,
        canViewActivity,
      })
    : "/login";

  useEffect(() => {
    if (isLoading) return;

    if (area === "guest" && user) {
      router.replace(homePath);
      return;
    }

    if (area !== "guest" && !user) {
      router.replace(authUnavailable ? "/error/503" : "/login");
      return;
    }

    if (area !== "admin" || !user || !realUser) return;
    if (!canEnterAdminArea(realUser.role, isImpersonating)) return;

    const adminHome = getAdminHomePath({
      canViewOverview,
      canViewEvents,
      canViewUsers,
      canViewActivity,
    });

    if (isAdminOverviewPath(pathname) && !canViewOverview) {
      if (adminHome !== pathname) router.replace(adminHome);
      return;
    }
    if (pathname.startsWith("/admin/events") && !canViewEvents) {
      router.replace(adminHome);
      return;
    }
    if (pathname.startsWith("/admin/users") && !canViewUsers) {
      router.replace(adminHome);
      return;
    }
    if (pathname.startsWith("/admin/activity") && !canViewActivity) {
      router.replace(adminHome);
    }
  }, [
    area,
    authUnavailable,
    canViewActivity,
    canViewEvents,
    canViewOverview,
    canViewUsers,
    homePath,
    isImpersonating,
    isLoading,
    pathname,
    realUser,
    router,
    user,
  ]);

  if (isLoading) {
    return <HoldScreen />;
  }

  if (area === "guest") {
    if (user) return <HoldScreen />;
    return <>{children}</>;
  }

  if (!user || !realUser) {
    return <HoldScreen />;
  }

  const allowAdmin = canEnterAdminArea(realUser.role, isImpersonating);
  const allowEvent = canEnterEventArea(
    user.role,
    realUser.role,
    isImpersonating,
    inspectedEventId,
  );

  if (
    (area === "admin" && !allowAdmin) ||
    (area === "event" && !allowEvent)
  ) {
    return (
      <ErrorPage
        code="403"
        title={t("title")}
        message={t("message")}
        backLabel={t("backHome")}
        homeHref={homePath}
      />
    );
  }

  if (area === "admin") {
    if (isAdminOverviewPath(pathname) && !canViewOverview) {
      return <HoldScreen />;
    }
    if (pathname.startsWith("/admin/events") && !canViewEvents) {
      return <HoldScreen />;
    }
    if (pathname.startsWith("/admin/users") && !canViewUsers) {
      return <HoldScreen />;
    }
    if (pathname.startsWith("/admin/activity") && !canViewActivity) {
      return <HoldScreen />;
    }
  }

  return <>{children}</>;
}
