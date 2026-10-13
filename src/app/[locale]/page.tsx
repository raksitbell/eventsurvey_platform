"use client";

import { useAuth } from "@/context/AuthContext";
import { getHomePathForRole } from "@/core/auth";
import { useRouter } from "@/i18n/navigation";
import { useEffect } from "react";

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    router.replace(user ? getHomePathForRole(user.role) : "/login");
  }, [isLoading, router, user]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-white dark:bg-gray-900">
      <span className="text-sm text-gray-300 dark:text-gray-700">…</span>
    </div>
  );
}
