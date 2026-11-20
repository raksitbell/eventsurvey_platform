"use client";

import Skeleton from "@/components/ui/skeleton/Skeleton";

function FormCardSkeleton() {
  return (
    <section className="flex min-h-83 min-w-0 flex-col gap-4.5 rounded-xl border border-event-tile bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
      <header className="flex items-center justify-between gap-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </header>
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-12" />
        <Skeleton className="h-3.5 w-20" />
      </div>
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
      <div className="mt-auto">
        <Skeleton className="h-11 w-full rounded-preview-control" />
      </div>
    </section>
  );
}

export default function SetupFormsLoadingSkeleton({
  label,
}: {
  label: string;
}) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className="grid items-stretch gap-2 rounded-xl bg-white p-4 lg:grid-cols-[1fr_auto_1fr] lg:p-6 dark:bg-gray-900"
    >
      <span className="sr-only">{label}</span>
      <FormCardSkeleton />
      <div className="flex w-full items-center justify-center lg:w-20">
        <Skeleton className="size-8 rounded-full" />
      </div>
      <FormCardSkeleton />
    </div>
  );
}
