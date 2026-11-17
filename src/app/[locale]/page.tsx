"use client";

import Skeleton from "@/components/ui/skeleton/Skeleton";
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
