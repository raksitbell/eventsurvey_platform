import type { AnalyticsData } from "@/types/event/analytics";
import { csvCell } from "@/core/analytics/policy";
interface ReportColumns {
  responseId: string;
  form: string;
  submittedAt: string;
}

interface PrintReportLabels extends ReportColumns {
  title: string;
  print: string;
  range: string;
  all: string;
  masked: string;
  raw: string;
  total: string;
  empty: string;
}

export function reportMatrix(
  data: AnalyticsData,
  columns: ReportColumns,
): string[][] {
  const headers = [
    columns.responseId,
    columns.form,
    columns.submittedAt,
    ...data.fields.map((f) => `${f.label} [${f.id}]`),
  ];
  return [
    headers,
    ...data.rows.map((r) => [
      r.id,
      data.forms.find((f) => f.id === r.formId)?.title || r.formId,
      new Intl.DateTimeFormat(data.filters.locale, {
        timeZone: data.event.timezone,
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(r.submittedAt)),
      ...data.fields.map((f) => r.values[f.id] || ""),
    ]),
  ];
}
export function csvReport(data: AnalyticsData, columns: ReportColumns) {
  return (
    "\uFEFF" +
    reportMatrix(data, columns)
      .map((row) => row.map(csvCell).join(","))
      .join("\r\n")
  );
}
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function printReport(data: AnalyticsData, text: PrintReportLabels) {
  const matrix = reportMatrix(data, text);
  return `<!doctype html><html lang="${data.filters.locale}"><head><meta charset="utf-8"><title>${escape(text.title)}</title><style>body{font:14px system-ui,sans-serif;color:#1d2939;margin:32px}h1{font-size:26px}header{border-bottom:3px solid #465fff;padding-bottom:20px}section{break-inside:avoid;border:1px solid #ddd;border-radius:8px;margin:18px 0;padding:16px}dl{display:grid;grid-template-columns:35% 65%}dt,dd{margin:0;padding:7px;overflow-wrap:anywhere}dt{font-weight:bold}button{padding:12px 20px;background:#465fff;color:white;border:0;border-radius:6px;cursor:pointer}@page{size:A4;margin:16mm}@media print{body{margin:0}button{display:none}section{break-inside:avoid}header{break-after:avoid}}</style></head><body><button onclick="window.print()">${escape(text.print)}</button><header><h1>${escape(data.event.title)}</h1><h2>${escape(text.title)}</h2><p>${escape(text.range)}: ${escape(data.filters.from || text.all)} — ${escape(data.filters.to || text.all)} (${escape(data.event.timezone)})</p><p>${escape(data.forms.find((f) => f.id === data.filters.formId)?.title || text.all)} · ${escape(text.total)}: ${data.rows.length}</p><strong>${escape(data.filters.raw ? text.raw : text.masked)}</strong></header>${
    data.rows.length
      ? matrix
          .slice(1)
          .map(
            (row) =>
              `<section><dl>${row.map((value, i) => `<dt>${escape(matrix[0][i])}</dt><dd>${escape(value || "—")}</dd>`).join("")}</dl></section>`,
          )
          .join("")
      : `<p>${escape(text.empty)}</p>`
  }</body></html>`;
}
