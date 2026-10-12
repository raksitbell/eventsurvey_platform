import ErrorPage from "@/components/common/ErrorPage";
import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function Error503Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("errors.503");

  return (
    <ErrorPage
      code="503"
      title={t("title")}
      message={t("message")}
      backLabel={t("backHome")}
    />
  );
}
