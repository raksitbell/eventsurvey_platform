import { useLocale, useTranslations } from "next-intl";
import { bannerLayouts } from "@/core/event/banner-layout";
import { contentLanguageName } from "@/core/event/content";
import { eventSetupStepHref, formBuilderEntryHref, whitelistEntryHref } from "@/core/event/form-builder-navigation";
import { surveyClosingTime } from "@/core/event/schedule";
import { toBangkokInput } from "@/core/i18n/bangkok-datetime";
import type { PublishIssue, reviewPublication } from "@/core/event/publication";
import type { EventDraft } from "@/types/event/setup";
import type { EventBranding } from "@/types/event/branding";
import type useParticipantPreviewLanguage from "@/hooks/useParticipantPreviewLanguage";
import "./publish-view.css";

interface Props {
  draft: EventDraft;
  branding: EventBranding;
  issues: PublishIssue[];
  forms: Parameters<typeof reviewPublication>[1];
  restrictedForms?: Parameters<typeof reviewPublication>[3];
  unreviewable?: { registration: boolean; survey: boolean };
  language: Pick<ReturnType<typeof useParticipantPreviewLanguage>, "contentLocale" | "translation">;
  formProblems: ReturnType<typeof reviewPublication>["formProblems"];
  checking: boolean;
  loadFailed: boolean;
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
  status?: "off" | "blocked" | "unverified";
}

export default function PublishChecklist({
  draft,
  branding,
  issues,
  forms,
  restrictedForms,
  unreviewable,
  language,
  formProblems,
  checking,
  loadFailed,
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
  const { contentLocale, translation } = language;
  const detailsPath = eventSetupStepHref("details", contentLocale);
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
        href: `${detailsPath}#${id}`,
      });
    }
  }
  addTranslatedField(
    "eventName",
    "contentTitle",
    details("name"),
    "event-name",
    translation.title,
  );
  const start = dateLabel(draft.startsAt);
  const end = dateLabel(draft.endsAt);
  rows.push(
    {
      key: "start",
      label: details("startsAt"),
      value: start ?? draft.startsAt,
      missing: !draft.startsAt?.trim(),
      href: `${detailsPath}#event-start`,
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
      href: `${detailsPath}#event-end`,
    },
  );
  addTranslatedField(
    "location",
    "contentVenue",
    details("location"),
    "event-location",
    translation.locationName,
  );
  rows.push(
    {
      key: "banner",
      label: setup("bannerRatio"),
      value: bannerLayouts[branding.layout ?? "portrait"].ratio,
      href: `${detailsPath}#event-media`,
    },
    {
      key: "access",
      label: setup("access"),
      value: details(draft.isPrivate ? "private" : "public"),
      href: `${detailsPath}#event-access`,
    },
  );
  if (mediaWarning)
    rows.push({
      key: "media",
      label: publish("brandingMedia"),
      href: `${detailsPath}#event-media`,
      warnings: [mediaWarning],
    });
  if (issues.includes("registeredEligibility"))
    rows.push({
      key: "surveyAccess",
      label: details("surveyAccess"),
      warnings: warnings("registeredEligibility"),
      status: "blocked",
      href: `${detailsPath}#survey-on`,
    });
  if (issues.includes("uniqueField"))
    rows.push({
      key: "uniqueField",
      label: "Unique ID",
      warnings: draft.hasRegistration && (checking || loadFailed || unreviewable?.registration) ? [] : warnings("uniqueField"),
      href: draft.hasRegistration
        ? formBuilderEntryHref("/event/setup/registration", "publish", contentLocale)
        : `${detailsPath}#registration-on`,
      permitted: !draft.hasRegistration || canManageRegistration,
      checking: draft.hasRegistration && checking,
      status: draft.hasRegistration && (loadFailed || unreviewable?.registration) ? "unverified" : undefined,
      missing: !restrictedForms?.registration?.present && !forms.registration?.questions.some(({ question }) => question.is_unique),
    });
  if (issues.includes("whitelist"))
    rows.push({
      key: "whitelist",
      label: details("manageWhitelist"),
      warnings: warnings("whitelist"),
      status: "blocked",
      href: draft.hasRegistration
        ? whitelistEntryHref("publish", contentLocale)
        : `${detailsPath}#registration-on`,
      permitted: !draft.hasRegistration || canManageRegistration,
    });
  if (issues.includes("capacity"))
    rows.push({
      key: "capacity",
      label: details("capacity.title"),
      warnings: warnings("capacity"),
      href: `${detailsPath}#event-access`,
    });
  if (issues.includes("surveySchedule") && (!issues.includes("eventSchedule") || (draft.surveyCloseMode === "custom" && !draft.surveyCustomClose)))
    rows.push({
      key: "surveySchedule",
      label: setup("surveyWindow"),
      warnings: warnings("surveySchedule"),
      href: `${detailsPath}#survey-schedule`,
      missing: !draft.startsAt || !surveyClosingTime(draft),
    });

  for (const kind of ["registration", "survey"] as const) {
    const enabled =
      kind === "registration" ? draft.hasRegistration : draft.hasSurvey;
    const form = forms[kind];
    const exists = restrictedForms?.[kind]?.present ?? !!form;
    const noQuestions = !!form && !form.questions.length;
    const unverified = loadFailed || unreviewable?.[kind];
    const title = form?.head[contentLocale ?? locale]?.title.trim() ||
      form?.head.th?.title.trim() || form?.head.en?.title.trim();
    const formWarnings = !exists ? [publish("saveForm")] : formProblems[kind].map((issue) => {
      if (issue === "formContent" && noQuestions) return publish("addQuestion");
      if (issue === "formContent" && form && !title)
        return publish("addFormTitle");
      return issueText(issue);
    });
    rows.push({
      key: kind,
      label: setup(kind),
      value: enabled ? title || setup("enabled") : undefined,
      missing: enabled && (!exists || noQuestions),
      status: !enabled ? "off" : unverified ? "unverified" : undefined,
      warnings: enabled && !checking && !unverified ? formWarnings : [],
      checking: enabled && checking,
      href: enabled
        ? formBuilderEntryHref(`/event/setup/${kind}`, "publish", contentLocale)
        : `${detailsPath}#${kind}-on`,
      permitted:
        !enabled ||
        (kind === "registration" ? canManageRegistration : canManageSurvey),
    });
  }
  const badges = {
    complete: { text: setup("ready"), icon: "✓" },
    "needs-edit": { text: labels("needsEdit"), icon: "!" },
    missing: { text: labels("missing"), icon: "○" },
    checking: { text: labels("checking"), icon: "○" },
    off: { text: labels("off"), icon: "–" },
    blocked: { text: publish("blocked"), icon: "!" },
    unverified: { text: publish("unverified"), icon: "!" },
  };
  return (
    <section className="publish-card publish-checklist" aria-busy={checking}>
      <h2>{setup("checklist")}</h2>
      <p className="publish-checklist__hint">{labels("checklistHint")}</p>
      {rows.map((row) => {
        const status = row.status ?? (row.checking
          ? "checking"
          : row.missing
            ? "missing"
            : row.warnings?.length
              ? "needs-edit"
              : "complete");
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
              {badges[status].icon}
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
              {badges[status].text}
            </span>
          </button>
        );
      })}
    </section>
  );
}
