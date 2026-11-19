"use client";

import Skeleton, {
  TableBodySkeleton,
} from "@/components/ui/skeleton/Skeleton";

export default function WhitelistLoadingSkeleton({ label }: { label: string }) {
  return (
    <div
      className="es-list-page"
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">{label}</span>
      <div className="es-list-content" aria-hidden="true">
        <header className="es-list-heading">
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
          <Skeleton className="h-7 w-20 rounded-full" />
        </header>

        <section className="es-list-registry space-y-4">
          <dl className="es-list-totals grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-6 w-10" />
              </div>
            ))}
          </dl>

          <div className="es-list-tools flex flex-wrap items-center gap-3">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-10 min-w-48 flex-1 rounded-lg" />
            <Skeleton className="h-10 w-24 rounded-lg" />
            <Skeleton className="h-10 w-24 rounded-lg" />
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

      <footer className="es-list-footer flex flex-wrap justify-end gap-3">
        <Skeleton className="h-10 w-24 rounded-lg" />
        <Skeleton className="h-10 w-28 rounded-lg" />
      </footer>
    </div>
  );
}
