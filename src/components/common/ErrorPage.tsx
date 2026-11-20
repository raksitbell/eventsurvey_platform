"use client";

import GridShape from "@/components/common/GridShape";
import { useAuth } from "@/context/AuthContext";
import { getHomePathForRole } from "@/core/auth";
import { Link } from "@/i18n/navigation";
import Image from "next/image";

type ErrorCode = "403" | "404" | "500" | "503";

interface ErrorPageProps {
  code: ErrorCode;
  title: string;
  message: string;
  backLabel: string;
  /** Prefer an explicit destination, then the active account home. */
  homeHref?: string;
}

export default function ErrorPage({
  code,
  title,
  message,
  backLabel,
  homeHref,
}: ErrorPageProps) {
  const { user } = useAuth();
  const href = homeHref && homeHref !== "/"
    ? homeHref
    : user ? getHomePathForRole(user.role) : "/login";

  return (
    <div className="relative z-1 flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-white p-6 dark:bg-gray-900">
      <GridShape />
      <div className="mx-auto w-full max-w-60.5 text-center sm:max-w-118">
        <h1 className="mb-8 text-title-md font-bold text-gray-800 xl:text-title-2xl dark:text-white/90">
          {title}
        </h1>

        <Image
          src={`/images/error/${code}.svg`}
          alt={code}
          width={472}
          height={152}
          className="mx-auto h-auto w-full max-w-[472px] dark:hidden"
        />
        <Image
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
