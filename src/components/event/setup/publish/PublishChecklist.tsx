import { useFormatter, useTranslations } from "next-intl";
import { bannerLayouts } from "@/core/event/banner-layout";
import type { PublishIssue } from "@/core/event/publication";
import type { EventDraft } from "@/types/event/setup";
import type { EventBranding } from "@/types/event/branding";

interface Props {
  draft: EventDraft;
  branding: EventBranding;
  issues: PublishIssue[];
  loading: boolean;
}
export default function PublishChecklist({
  draft,
  branding,
  issues,
  loading,
}: Props) {
  const t = useTranslations("eventSetup"),
    d = useTranslations("eventHome.details"),
    p = useTranslations("eventPublish"),
    fmt = useFormatter();
  const date = (v: string | null) =>
    v
      ? fmt.dateTime(new Date(v), {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: "Asia/Bangkok",
        })
      : "—";
  const rows = [
    {
      label: d("name") + " *",
      value: draft.eventName,
      ok: !issues.includes("eventName"),
    },
    {
      label: d("startsAt") + " *",
      value: date(draft.startsAt),
      ok: !!draft.startsAt,
    },
    {
      label: d("endsAt") + " *",
      value: date(draft.endsAt),
      ok: !issues.includes("eventSchedule"),
    },
    {
      label: d("location") + " *",
      value: draft.locationName,
      ok: !issues.includes("location"),
    },
    {
      label: t("bannerRatio") + " *",
      value: bannerLayouts[branding.layout ?? "portrait"].ratio,
      ok: true,
    },
    {
      label: t("access") + " *",
      value: d(draft.isPrivate ? "private" : "public"),
      ok: !issues.includes("whitelist") && !issues.includes("uniqueField"),
    },
  ];
  return (
    <section className="space-y-3 rounded-xl border border-event-border p-4 dark:border-gray-700">
      <h2 className="font-semibold">{t("checklist")}</h2>
      {rows.map((row) => (
        <div className="event-section flex items-center gap-3" key={row.label}>
          <span aria-hidden>{row.ok ? "✓" : "○"}</span>
          <div className="min-w-0 flex-1 text-sm">
            <strong>{row.label}</strong>
            <p className="wrap-anywhere">{row.value || "—"}</p>
          </div>
          <span className="text-xs">{t(row.ok ? "ready" : "incomplete")}</span>
        </div>
      ))}
      <div className="grid grid-cols-2 gap-2">
        {(["hasRegistration", "hasSurvey"] as const).map((key) => (
          <div className="event-section text-sm" key={key}>
            <strong>{d(key)}</strong>
            <p>{d(draft[key] ? "formOn" : "formOff")}</p>
          </div>
        ))}
      </div>
      {!loading &&
        issues
          .filter(
            (x) => !["eventName", "eventSchedule", "location"].includes(x),
          )
          .map((issue) => (
            <p
              key={issue}
              className="text-sm text-error-600 dark:text-error-400"
            >
              {p("issues." + issue)}
            </p>
          ))}
    </section>
  );
}
