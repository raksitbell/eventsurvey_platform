import ErrorPage from "@/components/common/ErrorPage";
import { getTranslations } from "next-intl/server";

export default async function Error404Page() {
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
