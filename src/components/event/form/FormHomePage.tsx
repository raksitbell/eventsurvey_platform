import { useTranslations } from "next-intl";
import { FORM_TYPES } from "@/types/event/form";
import { PageIcon } from "@/icons";
import { Link } from "@/i18n/navigation";

export default function FormHomePage() {
  const t = useTranslations("form");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl dark:text-white/90">
          {t("title")}
        </h1>
      </div>

      {/* card */}
      <div className="rounded-xl border border-gray-200 p-3 sm:p-4 dark:border-gray-800">
        <div className="flex flex-col gap-3 sm:gap-4">
          {FORM_TYPES.map((type, key) => {
            return (
              <div
                key={key}
                className="flex flex-col gap-3 rounded-xl border border-gray-200 p-3 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-4 dark:border-gray-800"
              >
                <div className="flex items-center gap-3">
                  <div className="shrink-0 rounded-lg bg-blue-100 p-2 text-blue-500">
                    <PageIcon className="h-6 w-6" />
                  </div>
                  <h3 className="font-medium text-gray-800 dark:text-white/90">
                    {t(type)}
                  </h3>
                </div>

                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <span className="text-sm text-gray-500">status</span>
                  <Link
                    href={`/form/${type}`}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-blue-100"
                  >
                    {t("open")}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
