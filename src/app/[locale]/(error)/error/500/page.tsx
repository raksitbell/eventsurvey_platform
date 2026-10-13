import ErrorPage from "@/components/common/ErrorPage";
import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function Error500Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("errors.500");

  return (
    <ErrorPage
      code="500"
      title={t("title")}
      message={t("message")}
      backLabel={t("backHome")}
    />
  );
}
