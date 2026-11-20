"use client";

import EditUserForm from "@/components/admin/users/EditUserForm";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

export default function AdminUserEditPage() {
  const params = useParams<{ id: string }>();
  const t = useTranslations("adminUsers");

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
      <EditUserForm userId={params.id} />
    </div>
  );
}
