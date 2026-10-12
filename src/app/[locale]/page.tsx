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
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-gray-900">
      <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
    </div>
  );
}
