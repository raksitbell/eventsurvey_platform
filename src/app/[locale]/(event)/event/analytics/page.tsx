import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";

export default async function Page() {
  redirect({ href: "/event/dashboard", locale: await getLocale() });
}
