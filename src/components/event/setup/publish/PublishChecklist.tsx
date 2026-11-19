import { useLocale, useTranslations } from "next-intl";
import { bannerLayouts } from "@/core/event/banner-layout";
import { contentLanguageName } from "@/core/event/content";
import { toBangkokInput } from "@/core/i18n/bangkok-datetime";
import type { PublishIssue, reviewPublication } from "@/core/event/publication";
import type { EventDraft } from "@/types/event/setup";
import type { EventBranding } from "@/types/event/branding";
import "./publish-view.css";

interface Props {
  draft: EventDraft;
  branding: EventBranding;
  issues: PublishIssue[];
  forms: Parameters<typeof reviewPublication>[1];
  formProblems: ReturnType<typeof reviewPublication>["formProblems"];
  checking: boolean;
  mediaWarning?: string;
  startWarning?: string;
  endWarning?: string;
  canEdit: boolean;
  canManageRegistration: boolean;
  canManageSurvey: boolean;
  onEdit: (href: string) => void;
}

function dateLabel(value: string | null) {
  const bangkok = toBangkokInput(value);
  if (!bangkok) return null;
  const [date, time] = bangkok.split("T");
  return date.split("-").reverse().join("/") + " · " + time;
}

interface ChecklistRow {
  key: string;
  label: string;
  href: string;
  value?: string | null;
  warnings?: string[];
  permitted?: boolean;
  checking?: boolean;
  missing?: boolean;
}

export default function PublishChecklist({
  draft,
  branding,
  issues,
  forms,
  formProblems,
  checking,
  mediaWarning,
  startWarning,
  endWarning,
  canEdit,
  canManageRegistration,
  canManageSurvey,
  onEdit,
}: Props) {
  const setup = useTranslations("eventSetup");
  const details = useTranslations("eventHome.details");
  const publish = useTranslations("eventPublish");
  const labels = useTranslations("eventPublishedView");
  const locale = useLocale();
  const issueText = (issue: PublishIssue) =>
    typeof issue === "string"
      ? publish(`issues.${issue}`)
      : publish(`issues.${issue.key}`, {
          language: contentLanguageName(issue.localeCode, locale),
        });
  const warnings = (issue: PublishIssue) =>
    issues.includes(issue) ? [issueText(issue)] : [];
  const rows: ChecklistRow[] = [];

  function addTranslatedField(
    key: "eventName" | "location",
    issueKey: "contentTitle" | "contentVenue",
    label: string,
    id: string,
    value: string | null,
  ) {
    const missing = issues.filter(
      (issue) => typeof issue !== "string" && issue.key === issueKey,
    );
    if (missing.length) {
      for (const issue of missing) {
        if (typeof issue === "string") continue;
        rows.push({
          key: key + issue.localeCode,
          label,
          missing: true,
          warnings: [issueText(issue)],
          href: `/event/details?lang=${encodeURIComponent(issue.localeCode)}#${id}`,
        });
      }
    } else {
      rows.push({
        key,
        label,
        value,
        missing: !value?.trim(),
        warnings: warnings(key),
        href: `/event/details#${id}`,
      });
    }
  }
  addTranslatedField(
    "eventName",
    "contentTitle",
    details("name"),
    "event-name",
    draft.eventName,
  );
  const start = dateLabel(draft.startsAt);
  const end = dateLabel(draft.endsAt);
  rows.push(
    {
      key: "start",
      label: details("startsAt"),
      value: start ?? draft.startsAt,
      missing: !draft.startsAt?.trim(),
      href: "/event/details#event-start",
      warnings: startWarning
        ? [startWarning]
        : !start
          ? warnings("eventSchedule")
          : [],
    },
    {
      key: "end",
      label: details("endsAt"),
      value: end ?? draft.endsAt,
      missing: !draft.endsAt?.trim(),
      warnings: endWarning
        ? [endWarning]
        : !end || start
          ? warnings("eventSchedule")
          : [],
      href: "/event/details#event-end",
    },
  );
  addTranslatedField(
    "location",
    "contentVenue",
    details("location"),
    "event-location",
    draft.locationName,
  );
  rows.push(
    {
      key: "banner",
      label: setup("bannerRatio"),
      value: bannerLayouts[branding.layout ?? "portrait"].ratio,
      warnings: mediaWarning ? [mediaWarning] : [],
      href: "/event/details#event-media",
    },
    {
      key: "access",
      label: setup("access"),
      value: details(draft.isPrivate ? "private" : "public"),
      href: "/event/details#event-access",
      warnings: warnings("registeredEligibility"),
    },
  );
  if (issues.includes("uniqueField"))
    rows.push({
      key: "uniqueField",
      label: "Unique ID",
      warnings: warnings("uniqueField"),
      href: draft.hasRegistration
        ? "/event/setup/registration"
        : "/event/details#registration-on",
      permitted: !draft.hasRegistration || canManageRegistration,
      checking,
      missing: !forms.registration?.questions.some(({ question }) => question.is_unique),
    });
  if (issues.includes("whitelist"))
    rows.push({
      key: "whitelist",
      label: details("manageWhitelist"),
      warnings: warnings("whitelist"),
      href: draft.hasRegistration
        ? "/event/whitelist"
        : "/event/details#registration-on",
      permitted: !draft.hasRegistration || canManageRegistration,
    });
  if (issues.includes("capacity"))
    rows.push({
      key: "capacity",
      label: details("capacity.title"),
      warnings: warnings("capacity"),
      href: "/event/details#event-access",
    });
  if (issues.includes("surveySchedule"))
    rows.push({
      key: "surveySchedule",
      label: setup("surveyWindow"),
      warnings: warnings("surveySchedule"),
      href: "/event/details#survey-schedule",
      missing: !forms.survey?.opensAt || !forms.survey?.closesAt,
    });

  for (const kind of ["registration", "survey"] as const) {
    const enabled =
      kind === "registration" ? draft.hasRegistration : draft.hasSurvey;
    const problems = formProblems[kind];
    rows.push({
      key: kind,
      label: labels(kind),
      value: enabled ? setup("enabled") : labels("off"),
      missing: enabled && !forms[kind]?.questions.length,
      warnings: !checking && enabled ? problems.map(issueText) : [],
      checking: enabled && checking,
      href: enabled ? `/event/setup/${kind}` : `/event/details#${kind}-on`,
      permitted:
        !enabled ||
        (kind === "registration" ? canManageRegistration : canManageSurvey),
    });
  }
  return (
    <section className="publish-card publish-checklist" aria-busy={checking}>
      <h2>{setup("checklist")}</h2>
      <p className="publish-checklist__hint">{labels("checklistHint")}</p>
      {rows.map((row) => {
        const status = row.checking
          ? "checking"
          : row.missing
            ? "missing"
            : row.warnings?.length
              ? "needs-edit"
              : "complete";
        return (
          <button
            type="button"
            key={row.key}
            className="publish-checklist__row"
            data-status={status}
            disabled={!canEdit || row.permitted === false}
            onClick={() => onEdit(row.href)}
          >
            <span className="publish-checklist__icon" aria-hidden="true">
              {status === "complete" ? "✓" : status === "needs-edit" ? "!" : "○"}
            </span>
            <span className="publish-checklist__value">
              <strong>{row.label}</strong>
              {row.value && <small>{row.value}</small>}
              {row.warnings?.map((text) => (
                <small className="publish-checklist__warning" key={text}>
                  {text}
                </small>
              ))}
            </span>
            <span className="publish-checklist__badge">
              {status === "complete"
                ? setup("ready")
                : status === "needs-edit"
                  ? labels("needsEdit")
                  : labels(status)}
            </span>
          </button>
        );
      })}
    </section>
  );
}
