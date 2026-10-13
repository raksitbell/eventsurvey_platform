import ErrorPage from "@/components/common/ErrorPage";
import { getTranslations } from "next-intl/server";

export default async function Error503Page() {
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
