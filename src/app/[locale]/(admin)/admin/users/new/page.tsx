import CreateUserForm from "@/components/admin/users/CreateUserForm";
import { redirect } from "@/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";

export default async function AdminCreateUserPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string | string[] }>;
}) {
  const { from } = await searchParams;
  if (from === "trial-accounts") {
    redirect({ href: "/admin/configuration?tab=trial-accounts", locale: await getLocale() });
  }
  const t = await getTranslations("adminUsers.form");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white/90">
          {t("createTitle")}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t("subtitle")}
        </p>
      </div>
      <CreateUserForm />
    </div>
  );
}
