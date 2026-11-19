"use client";

import AdminActivityPanel from "@/components/admin/activity/AdminActivityPanel";
import ErrorPage from "@/components/common/ErrorPage";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "next-intl";

export default function AdminActivityPage() {
  const t = useTranslations("adminActivity");
  const te = useTranslations("errors.403");
  const { canViewActivity, isLoading } = useAuth();

  if (isLoading) return null;
  if (!canViewActivity) {
    return (
      <ErrorPage
        code="403"
        title={te("title")}
        message={te("message")}
        backLabel={te("backHome")}
      />
    );
  }

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
      <AdminActivityPanel />
    </div>
  );
}
