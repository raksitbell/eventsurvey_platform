import { getTranslations } from "next-intl/server";
import { csv, responseCsv } from "@/core/event/export";
import type { Locale } from "@/i18n/routing";
import type { ExportSummary } from "@/types/event/reporting";
import { getReportingData, ReportingError } from "./reporting";

export async function getReportExport(
  userId: string,
  locale: Locale,
  query: URLSearchParams,
  inspectedEventId?: string | null,
) {
  const data = await getReportingData(userId, locale, undefined, {
    inspectedEventId,
    purpose: "export",
    eventId: query.get("eventId"),
    formId: query.get("formId"),
  });
  const fromResponses = query.get("scope") === "responses";
  if (fromResponses && !data.canViewSubmissions)
    throw new ReportingError(403, "Forbidden");
  const forms = data.forms.filter((form) => fromResponses || form.approved);
  const allowed = new Set(forms.map((form) => form.id));
  const formId = query.get("formId");
  if (formId && !allowed.has(formId))
    throw new ReportingError(403, "Forbidden");
  const search = query.get("search")?.trim().toLocaleLowerCase(locale);
  const rows = data.responses.filter(
    (row) =>
      allowed.has(row.formId) &&
      (!formId || formId === row.formId) &&
      (!search ||
        `${row.respondent} ${row.id}`
          .toLocaleLowerCase(locale)
          .includes(search)),
  );
  const counts = forms
    .filter((form) => !formId || form.id === formId)
    .map((form) => ({
      id: form.id,
      title: form.title,
      count: rows.filter((row) => row.formId === form.id).length,
    }));
  const format = query.get("format");
  if (!format) {
    return {
      eventId: data.eventId,
      eventName: data.eventName,
      forms: counts,
    } satisfies ExportSummary;
  }
  const kind = query.get("kind");
  if ((kind !== "summary" && kind !== "responses") || format !== "csv") {
    throw new ReportingError(400, "Invalid report");
  }
  const t = await getTranslations({ locale, namespace: "eventReports" });
  const content =
    kind === "summary"
      ? csv([
          [t("item"), t("count")],
          ...counts.map((form) => [form.title, form.count]),
        ])
      : responseCsv(rows, [t("id"), t("respondent"), t("submitted")]);
  return { filename: `${kind}.csv`, content };
}
