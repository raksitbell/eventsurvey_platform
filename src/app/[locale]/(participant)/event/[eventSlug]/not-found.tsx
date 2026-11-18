import { getTranslations } from "next-intl/server";

export default async function PublicEventNotFound() {
  const t = await getTranslations("errors.404");

  return (
    <main className="flex min-h-dvh items-center justify-center bg-gray-50 px-4 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <div className="max-w-xl space-y-3 text-center">
        <h1 className="text-title-sm font-semibold">{t("title")}</h1>
        <p className="text-gray-700 dark:text-gray-300">{t("message")}</p>
      </div>
    </main>
  );
}
