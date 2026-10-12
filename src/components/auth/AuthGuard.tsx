"use client";

import { useAuth } from "@/context/AuthContext";
import {
  canAccessAdmin,
  canAccessEvent,
  getHomePathForRole,
} from "@/core/auth";
import type { UserRole } from "@/types/user";
import { useRouter } from "@/i18n/navigation";
import { useEffect } from "react";

type GuardArea = "admin" | "event" | "guest";

interface AuthGuardProps {
  area: GuardArea;
  children: React.ReactNode;
}

function canAccessArea(area: GuardArea, role: UserRole | undefined) {
  if (!role) return false;
  if (area === "admin") return canAccessAdmin(role);
  if (area === "event") return canAccessEvent(role);
  return false;
}

export default function AuthGuard({ area, children }: AuthGuardProps) {
  const { user, realUser, isImpersonating, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (area === "guest") {
      if (user) {
        router.replace(getHomePathForRole(user.role));
      }
      return;
    }

    if (!user) {
      router.replace("/login");
      return;
    }

    if (area === "admin") {
      const adminIdentity = isImpersonating ? realUser : user;
      if (!adminIdentity || !canAccessAdmin(adminIdentity.role)) {
        router.replace(user ? getHomePathForRole(user.role) : "/login");
      }
      return;
    }

    if (!canAccessArea(area, user.role)) {
      router.replace(getHomePathForRole(user.role));
    }
  }, [area, isImpersonating, isLoading, realUser, router, user]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-gray-900">
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  if (area === "guest") {
    if (user) return null;
    return <>{children}</>;
  }

  if (!user) return null;

  if (area === "admin") {
    const adminIdentity = isImpersonating ? realUser : user;
    if (!adminIdentity || !canAccessAdmin(adminIdentity.role)) return null;
    if (isImpersonating) return null;
  }

  if (area === "event" && !canAccessEvent(user.role)) return null;

  return <>{children}</>;
}
