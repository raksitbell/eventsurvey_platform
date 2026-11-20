import ErrorPage from "@/components/common/ErrorPage";
import { getTranslations } from "next-intl/server";

export default async function Error403Page() {
  const t = await getTranslations("errors.403");

  return (
    <ErrorPage
      code="403"
      title={t("title")}
      message={t("message")}
      backLabel={t("backHome")}
    />
  );
}
