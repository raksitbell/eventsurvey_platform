import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ formId?: string | string[] }>;
}) {
  const { formId } = await searchParams;
  redirect({
    href:
      typeof formId === "string" && formId
        ? `/event/responses?formId=${encodeURIComponent(formId)}`
        : "/event/responses",
    locale: await getLocale(),
  });
}
