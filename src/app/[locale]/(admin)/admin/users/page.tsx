import UsersTable from "@/components/admin/UsersTable";
import { getTranslations } from "next-intl/server";

export default async function AdminUsersPage() {
  const t = await getTranslations("adminUsers");

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
      <UsersTable />
    </div>
  );
}
