"use client";

import EventPreview from "@/components/admin/events/EventPreview";
import Skeleton from "@/components/ui/skeleton/Skeleton";
import { useParams } from "next/navigation";
import { Suspense } from "react";

export default function AdminEventDetailPage() {
  const params = useParams<{ id: string }>();
  return (
    <Suspense
      fallback={
        <div className="space-y-4" aria-busy="true">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      }
    >
      <EventPreview eventId={params.id} />
    </Suspense>
  );
}
