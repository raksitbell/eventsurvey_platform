import ErrorPage from "@/components/common/ErrorPage";
import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function Error404Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("errors.404");

  return (
    <ErrorPage
      code="404"
      title={t("title")}
      message={t("message")}
      backLabel={t("backHome")}
    />
  );
}
