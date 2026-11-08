"use client";

import ErrorPage from "@/components/common/ErrorPage";
import Skeleton from "@/components/ui/skeleton/Skeleton";
import { useAuth } from "@/context/AuthContext";
import {
  canEnterAdminArea,
  canEnterEventArea,
  getHomePathForRole,
} from "@/core/auth";
import { useRouter } from "@/i18n/navigation";
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

export default function AuthGuard({ area, children }: AuthGuardProps) {
  const { user, realUser, isImpersonating, isLoading } = useAuth();
  const router = useRouter();
  const t = useTranslations("errors.403");

  useEffect(() => {
    if (isLoading) return;

    if (area === "guest" && user) {
      router.replace(getHomePathForRole(user.role));
      return;
    }

    if (area !== "guest" && !user) {
      router.replace("/login");
    }
  }, [area, isLoading, router, user]);

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
        homeHref={getHomePathForRole(realUser.role)}
      />
    );
  }

  return <>{children}</>;
}
