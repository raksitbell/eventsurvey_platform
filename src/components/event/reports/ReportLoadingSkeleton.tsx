"use client";

import Skeleton, {
  TableBodySkeleton,
} from "@/components/ui/skeleton/Skeleton";

type ReportSection = "dashboard" | "responses" | "exports" | "trash";

const panelClass =
  "rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900";

function HeroBannerSkeleton() {
  return (
    <div className="rounded-2xl bg-gray-900 p-6 dark:bg-gray-800">
      <Skeleton className="h-5 w-40 bg-gray-700 dark:bg-gray-700" />
      <Skeleton className="mt-3 h-3.5 w-64 max-w-full bg-gray-700 dark:bg-gray-700" />
    </div>
  );
}

function TablePanelSkeleton({ columns }: { columns: number }) {
  return (
    <section className={panelClass}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Skeleton className="h-5 w-36" />
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-10 w-40 rounded-lg" />
          <Skeleton className="h-10 w-48 rounded-lg" />
        </div>
      </div>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-theme-sm">
          <thead>
            <tr className="border-y border-gray-200 dark:border-gray-700">
              {Array.from({ length: columns }).map((_, index) => (
                <th key={index} className="py-3 pe-4 text-start">
                  <Skeleton className="h-3 w-20" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <TableBodySkeleton rows={5} columns={columns} />
          </tbody>
        </table>
      </div>
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5" aria-hidden="true">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className={`${panelClass} ${index % 4 === 0 ? "md:col-span-2" : ""} space-y-4`}
          >
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="size-8 rounded-lg" />
            </div>
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-28 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ResponsesSkeleton() {
  return (
    <div className="space-y-4" aria-hidden="true">
      <HeroBannerSkeleton />
      <TablePanelSkeleton columns={4} />
    </div>
  );
}

function ExportsSkeleton() {
  return (
    <div className="space-y-5" aria-hidden="true">
      <HeroBannerSkeleton />
      <div className="grid gap-5 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <article key={index} className={`${panelClass} flex flex-col gap-5`}>
            <Skeleton className="size-11 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-40" />
            </div>
            <Skeleton className="h-10 w-full rounded-lg" />
          </article>
        ))}
      </div>
    </div>
  );
}

function TrashSkeleton() {
  return (
    <div className="space-y-5" aria-hidden="true">
      <div className="rounded-2xl bg-warning-50 p-5 dark:bg-warning-500/10">
        <Skeleton className="h-5 w-40 bg-warning-200/70 dark:bg-warning-500/30" />
        <Skeleton className="mt-3 h-3.5 w-72 max-w-full bg-warning-200/70 dark:bg-warning-500/30" />
      </div>
      <TablePanelSkeleton columns={4} />
    </div>
  );
}

export default function ReportLoadingSkeleton({
  section,
  label,
}: {
  section: ReportSection;
  label: string;
}) {
  return (
    <div role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">{label}</span>
      {section === "dashboard" ? (
        <DashboardSkeleton />
      ) : section === "responses" ? (
        <ResponsesSkeleton />
      ) : section === "exports" ? (
        <ExportsSkeleton />
      ) : (
        <TrashSkeleton />
      )}
    </div>
  );
}
