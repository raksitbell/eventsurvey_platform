import CreateUserForm from "@/components/admin/users/CreateUserForm";
import { getTranslations } from "next-intl/server";

export default async function AdminCreateUserPage() {
  const t = await getTranslations("adminUsers");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white/90">
          {t("form.createTitle")}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t("form.subtitle")}
        </p>
      </div>
      <CreateUserForm />
    </div>
  );
}
