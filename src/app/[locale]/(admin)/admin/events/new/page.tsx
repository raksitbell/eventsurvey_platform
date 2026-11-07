import CreateEventForm from "@/components/admin/events/CreateEventForm";
import { getTranslations } from "next-intl/server";

export default async function AdminCreateEventPage() {
  const t = await getTranslations("adminEvents");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white/90">
          {t("create.title")}
        </h1>
      </div>
      <CreateEventForm />
    </div>
  );
}
