"use client";
import EventSetupBoundary, {
  type EventSetupPageProps,
} from "@/components/event/setup/EventSetupBoundary";
import Image from "next/image";
import Button from "@/components/ui/button/Button";
import { Link } from "@/i18n/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { QrCodeIcon } from "@heroicons/react/24/outline";
import { loadPublication, publicationKey } from "@/core/event/publication";
import { surveyClosingTime } from "@/core/event/schedule";

function PublishedQr({ workspace, userId, locale }: EventSetupPageProps) {
  const t = useTranslations("eventSetup"),
    f = useFormatter();
  const local = workspace.localPublishedAt
    ? loadPublication(publicationKey(userId, workspace.eventId, locale))
    : null;
  if (
    !local &&
    workspace.eventStatus !== "open" &&
    workspace.eventStatus !== "closed"
  )
    return (
      <div className="event-sheet">
        <Link href="/event">{t("backWorkspace")}</Link>
      </div>
    );
  const banner = local?.branding.banner?.url ?? workspace.bannerUrl;
  const data = local?.draft ?? workspace;
  const date = (v: string | null) =>
    v
      ? f.dateTime(new Date(v), {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: "Asia/Bangkok",
        })
      : "—";
  return (
    <article className="event-sheet space-y-5">
      <header className="flex items-center justify-between">
        <h1 className="text-title-sm font-bold">{t("qrTitle")}</h1>
        <span className="rounded-full bg-success-50 px-3 py-1 text-success-700 dark:bg-success-900 dark:text-success-200">
          {t(
            workspace.eventStatus === "closed" && !local
              ? "closed"
              : "published",
          )}
        </span>
      </header>
      <div className="event-section flex flex-wrap items-center justify-between gap-4">
        {banner && (
          <Image
            src={banner}
            alt=""
            unoptimized
            width={76}
            height={100}
            className="h-24 w-18 rounded-lg object-cover"
          />
        )}
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold wrap-anywhere">
            {data.eventName}
          </h2>
          {local?.branding.organizer && (
            <p className="mt-1 text-sm">{local.branding.organizer}</p>
          )}
        </div>
        <div className="space-y-1 text-sm">
          <strong>{t("dateTime")}</strong>
          <p>{date(data.startsAt)}</p>
          <p>{date(data.endsAt)}</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          "event",
          ...(data.hasRegistration ? ["registration"] : []),
          ...(data.hasSurvey ? ["survey"] : []),
        ].map((kind) => (
          <section
            key={kind}
            className={`event-section flex flex-col gap-3 ${kind === "event" ? "sm:col-span-2" : ""}`}
          >
            <h2 className="font-semibold">
              {t(kind === "event" ? "eventQr" : kind)}
            </h2>
            {kind !== "event" && (
              <p className="text-sm">
                {date(data.startsAt)} –{" "}
                {date(
                  kind === "survey" ? surveyClosingTime(data) : data.endsAt,
                )}
              </p>
            )}
            <QrCodeIcon
              aria-hidden
              className="mx-auto size-28 rounded-lg border border-event-border bg-white p-6 text-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-500"
            />
            <input
              className="event-input"
              aria-label={t("copyUrl")}
              value=""
              disabled
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" disabled>
                {t("copyUrl")}
              </Button>
              <Button variant="outline" disabled>
                {t("downloadQr")}
              </Button>
              {kind === "event" && (
                <Button variant="outline" disabled>
                  {t("openEvent")}
                </Button>
              )}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}
export default function PublishedQrPanel() {
  return <EventSetupBoundary component={PublishedQr} />;
}
