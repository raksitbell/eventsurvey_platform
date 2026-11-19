"use client";

import { useTranslations } from "next-intl";
import { bannerLayouts } from "@/core/event/banner-layout";
import { getChromeOpacity } from "@/core/event/participant-colors";
import { surveyClosingTime } from "@/core/event/schedule";
import type { EventBranding } from "@/types/event/branding";
import type { EventWorkspace } from "@/types/event/workspace";
import type { EventDraft } from "@/types/event/setup";
import PublishedEventSummary, {
  PublicationHeading,
} from "./PublishedEventSummary";
import useEventDisplayDate from "@/hooks/useEventDisplayDate";

export default function PublishedOverview({
  workspace,
  branding,
}: {
  workspace: EventWorkspace;
  branding: EventBranding;
}) {
  const t = useTranslations("eventPublishedView");
  const s = useTranslations("eventSetup");
  const d = useTranslations("eventHome.details");
  const date = useEventDisplayDate();
  const design = useTranslations("eventSetupDesign");
  const data: EventDraft = workspace;
  const layout = branding.layout ?? "portrait";
  const access = d(data.isPrivate ? "private" : "public");
  const form = (
    label: string,
    on: boolean,
    endsAt: string | null,
    postSurvey = false,
  ) => (
    <div>
      <dt>
        {label} · {s(on ? "enabled" : "disabled")}
        {on && postSurvey ? " · " + design("postSurvey") : ""}
      </dt>
      {on && (
        <dd>
          {date(data.startsAt, false)} – {date(endsAt, false)}
        </dd>
      )}
    </div>
  );
  const publishedSurvey = workspace.setup?.publication?.forms.survey;
  const surveyEnd = publishedSurvey ? publishedSurvey.closesAt : surveyClosingTime(data);
  return (
    <article
      data-published-overview
      className="published-event published-event--overview"
    >
      <PublicationHeading
        title={t("overview")}
        subtitle={t("readOnly")}
        closed={
          workspace.eventStatus === "closed" && !workspace.localPublishedAt
        }
      />
      <PublishedEventSummary
        draft={data}
        branding={branding}
        bannerUrl={workspace.bannerUrl}
      />
      <div className="published-event__pair">
        <section className="published-event__card">
          <h2>{s("eventDetails")}</h2>
          <dl>
            <div>
              <dt>{s("access")}</dt>
              <dd>{access}</dd>
            </div>
            <div>
              <dt>{d("location")}</dt>
              <dd>
                {[data.locationName, data.locationDetail]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </dd>
            </div>
            <div>
              <dt>{s("bannerRatio")}</dt>
              <dd>
                {bannerLayouts[layout].ratio} · {s(layout)}
              </dd>
            </div>
          </dl>
        </section>
        <section className="published-event__card">
          <h2>{t("formsAndSchedule")}</h2>
          <dl>
            {form(t("registration"), data.hasRegistration, data.endsAt)}
            {form(
              t("survey"),
              data.hasSurvey,
              surveyEnd,
              !!(
                surveyEnd &&
                data.endsAt &&
                Date.parse(surveyEnd) > Date.parse(data.endsAt)
              ),
            )}
          </dl>
          <p>{t("scheduleNote")}</p>
        </section>
      </div>
      <section className="published-event__card published-event__branding">
        <h2>{t("brandingTitle")}</h2>
        <dl>
          <div>
            <dt>{t("organizer")}</dt>
            <dd>{branding.organizer || "—"}</dd>
          </div>
          <div>
            <dt>{t("brandingStyle")}</dt>
            <dd>
              {s(branding.identity ?? "icon")} ·{" "}
              {s(branding.backgroundMode ?? "solid")}
            </dd>
          </div>
          <div>
            <dt>{t("chrome")}</dt>
            <dd>
              {branding.primary} / {branding.footerColor ?? branding.secondary}
              {getChromeOpacity(branding) < 100 && ` · ${t("transparencyValue", { percent: 100 - getChromeOpacity(branding) })}`}
            </dd>
          </div>
        </dl>
      </section>
    </article>
  );
}
