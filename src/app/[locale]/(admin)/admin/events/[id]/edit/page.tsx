"use client";

import EditEventForm from "@/components/admin/events/EditEventForm";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

export default function AdminEventEditPage() {
  const params = useParams<{ id: string }>();
  const t = useTranslations("adminEvents.editForm");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white/90">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t("description")}
        </p>
      </div>
      <EditEventForm eventId={params.id} />
    </div>
  );
}
