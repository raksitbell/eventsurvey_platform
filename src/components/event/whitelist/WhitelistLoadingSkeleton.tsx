"use client";

import Skeleton, {
  TableBodySkeleton,
} from "@/components/ui/skeleton/Skeleton";
import header from "@/components/event/workspace/EventWorkspacePageHeader.module.css";
import { useTranslations } from "next-intl";

export default function WhitelistLoadingSkeleton() {
  const t = useTranslations("eventWhitelist");
  return (
    <div
      className="es-list-page"
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">{t("loading")}</span>
      <header className={header.hero} aria-hidden="true">
        <div className={header.intro}>
          <Skeleton className="h-3 w-28 bg-white/20!" />
          <Skeleton className="h-7 w-48 max-w-full bg-white/30!" />
          <Skeleton className="h-4 w-72 max-w-full bg-white/20!" />
        </div>
        <div className={header.actions}>
          <Skeleton className="h-11 w-48 max-w-full bg-white/30!" />
          <Skeleton className="h-11 w-28 max-w-full bg-white/25!" />
        </div>
      </header>
      <div className="es-list-content" aria-hidden="true">
        <section className="es-list-registry space-y-4">
          <div className="es-list-tools flex flex-wrap items-center gap-3">
            <div className="es-list-intro space-y-2">
              <Skeleton className="h-5 w-40 max-w-full" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="es-list-search-skeleton h-11 rounded-lg" />
            <Skeleton className="h-11 w-28 rounded-lg" />
            <Skeleton className="h-11 w-28 rounded-lg" />
            <Skeleton className="h-11 w-28 rounded-lg" />
          </div>

          <div className="es-list-grid overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
            <table className="w-full text-theme-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <th key={index} className="h-12 px-3 text-start">
                      <Skeleton className="h-3 w-20" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <TableBodySkeleton rows={6} columns={4} />
              </tbody>
            </table>
          </div>
        </section>

        <Skeleton className="mt-4 h-4 w-80 max-w-full" />
      </div>
    </div>
  );
}
