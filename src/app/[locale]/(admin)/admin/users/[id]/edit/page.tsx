import EditUserForm from "@/components/admin/users/EditUserForm";
import { getTranslations } from "next-intl/server";

export default async function AdminUserEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string | string[] }>;
}) {
  const [{ id }, { from }, t] = await Promise.all([
    params,
    searchParams,
    getTranslations("adminUsers"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white/90">
          {t("form.editTitle")}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t("form.subtitle")}
        </p>
      </div>
      <EditUserForm userId={id} fromTrialAccounts={from === "trial-accounts"} />
    </div>
  );
}
