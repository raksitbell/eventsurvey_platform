"use client";

import Skeleton from "@/components/ui/skeleton/Skeleton";
import "./published-event.css";

function FormShareCardSkeleton() {
  return (
    <section className="published-qr__card published-qr__card--form">
      <header className="published-qr__form-heading">
        <Skeleton className="size-11 rounded-xl" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3.5 w-52 max-w-full" />
        </div>
      </header>
      <div className="published-qr__art">
        <Skeleton className="size-full rounded-xl" />
      </div>
      <Skeleton className="h-12 w-full rounded-[10px]" />
      <div className="published-qr__buttons">
        <Skeleton className="h-10 w-36 rounded-lg" />
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>
    </section>
  );
}

function ShareLinksBlocks() {
  return (
    <>
      <section className="published-qr__card published-qr__card--event">
        <div className="published-qr__details space-y-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-3.5 w-72 max-w-full" />
          <Skeleton className="h-11 w-full rounded-[10px]" />
        </div>
        <div className="published-qr__buttons">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      </section>
      <div className="published-event__pair">
        <FormShareCardSkeleton />
        <FormShareCardSkeleton />
      </div>
    </>
  );
}

export function QrShareLinksSkeleton({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className="flex flex-col gap-2.5"
    >
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="flex flex-col gap-2.5">
        <ShareLinksBlocks />
      </div>
    </div>
  );
}

export default function QrLoadingSkeleton({ label }: { label: string }) {
  return (
    <article
      className="published-event published-event--qr"
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">{label}</span>
      <header className="published-event__heading" aria-hidden="true">
        <Skeleton className="h-8 w-56 max-w-full" />
        <Skeleton className="h-8 w-28 rounded-full" />
      </header>

      <div className="published-event__summary" aria-hidden="true">
        <Skeleton className="h-24 w-20 rounded-[10px]" />
        <div className="published-event__identity space-y-2">
          <Skeleton className="h-5 w-48 max-w-full" />
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-3.5 w-40" />
        </div>
        <div className="published-event__dates space-y-2">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-4 w-44 max-w-full" />
          <Skeleton className="h-4 w-40 max-w-full" />
        </div>
      </div>

      <div aria-hidden="true" className="flex flex-col gap-2.5">
        <ShareLinksBlocks />
      </div>
    </article>
  );
}
