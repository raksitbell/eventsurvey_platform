import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function EventHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("eventHome");

  return (
    <div>
      <PageBreadcrumb pageTitle={t("title")} />
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
        <h3 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">
          {t("welcome")}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("description")}
        </p>
      </div>
    </div>
  );
}
