import EventsTable from "@/components/admin/events/EventsTable";
import { getTranslations } from "next-intl/server";

export default async function AdminEventsPage() {
  const t = await getTranslations("adminEvents");

  return (
    <div className="space-y-6">
      <div>
        <p className="text-theme-xs text-gray-400 dark:text-gray-500">
          {t("breadcrumb")}
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white/90">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t("description")}
        </p>
      </div>
      <EventsTable />
    </div>
  );
}
