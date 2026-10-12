import ErrorPage from "@/components/common/ErrorPage";
import { getTranslations } from "next-intl/server";

/**
 * Unknown paths under [locale]. Render 404 in-place — do not call notFound()
 * (that soft-navigation path hangs with Router-before-init / CatchAll errors).
 */
export default async function CatchAllPage() {
  const t = await getTranslations("errors.404");

  return (
    <ErrorPage
      code="404"
      title={t("title")}
      message={t("message")}
      backLabel={t("backHome")}
      homeHref="/"
    />
  );
}
