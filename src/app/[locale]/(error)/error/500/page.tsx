import ErrorPage from "@/components/common/ErrorPage";
import { getTranslations } from "next-intl/server";

export default async function Error500Page() {
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
