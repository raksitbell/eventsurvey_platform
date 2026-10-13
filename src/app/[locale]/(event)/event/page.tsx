import EventWorkspacePanel from "@/components/event/EventWorkspacePanel";
import { setRequestLocale } from "next-intl/server";

export default async function EventHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <EventWorkspacePanel />;
}
