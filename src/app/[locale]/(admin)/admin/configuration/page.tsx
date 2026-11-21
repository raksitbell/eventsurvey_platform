import ConfigurationTabs from "@/components/admin/configuration/ConfigurationTabs";
import Skeleton from "@/components/ui/skeleton/Skeleton";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

export default async function PlatformConfigurationPage() {
  const t = await getTranslations("platformConfiguration");
  return (
    <div className="min-w-0 space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white/90">
        {t("title")}
      </h1>
      <Suspense fallback={<Skeleton className="h-40 w-full" />}>
        <ConfigurationTabs />
      </Suspense>
    </div>
  );
}
