import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    formId?: string | string[];
    scope?: string | string[];
  }>;
}) {
  const { formId, scope } = await searchParams;
  redirect({
    href:
      scope === "all"
        ? "/event/responses?scope=all"
        : typeof formId === "string" && formId
          ? `/event/responses?formId=${encodeURIComponent(formId)}`
          : "/event/responses",
    locale: await getLocale(),
  });
}
