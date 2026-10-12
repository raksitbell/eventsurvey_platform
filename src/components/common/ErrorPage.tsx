"use client";

import GridShape from "@/components/common/GridShape";
import {
  AUTH_STORAGE_KEY,
  getHomePathForRole,
  readStoredUser,
} from "@/core/auth";
import { Link } from "@/i18n/navigation";
import { useEffect, useState } from "react";

type ErrorCode = "403" | "404" | "500" | "503";

interface ErrorPageProps {
  code: ErrorCode;
  title: string;
  message: string;
  backLabel: string;
  /** Prefer role home; falls back to stored session home or `/login` */
  homeHref?: string;
}

function resolveHomeHref(fallback?: string): string {
  if (fallback && fallback !== "/") return fallback;
  const stored = readStoredUser(AUTH_STORAGE_KEY);
  if (stored) return getHomePathForRole(stored.role);
  return fallback === "/" ? "/login" : fallback || "/login";
}

export default function ErrorPage({
  code,
  title,
  message,
  backLabel,
  homeHref,
}: ErrorPageProps) {
  // Don't read localStorage during render (SSR/client mismatch → hydration error)
  const [href, setHref] = useState(homeHref && homeHref !== "/" ? homeHref : "/login");

  useEffect(() => {
    setHref(resolveHomeHref(homeHref));
  }, [homeHref]);

  return (
    <div className="relative z-1 flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-white p-6 dark:bg-gray-900">
      <GridShape />
      <div className="mx-auto w-full max-w-60.5 text-center sm:max-w-118">
        <h1 className="mb-8 text-title-md font-bold text-gray-800 xl:text-title-2xl dark:text-white/90">
          {title}
        </h1>

        <img
          src={`/images/error/${code}.svg`}
          alt={code}
          width={472}
          height={152}
          className="mx-auto h-auto w-full max-w-[472px] dark:hidden"
        />
        <img
          src={`/images/error/${code}-dark.svg`}
          alt={code}
          width={472}
          height={152}
          className="mx-auto hidden h-auto w-full max-w-[472px] dark:block"
        />

        <p className="mt-10 mb-6 text-base text-gray-700 sm:text-lg dark:text-gray-400">
          {message}
        </p>

        <Link
          href={href}
          className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-5 py-3.5 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/3 dark:hover:text-gray-200"
        >
          {backLabel}
        </Link>
      </div>
      <p className="absolute inset-x-0 bottom-6 text-center text-sm text-gray-500 dark:text-gray-400">
        &copy; {new Date().getFullYear()} - EventSurvey
      </p>
    </div>
  );
}
