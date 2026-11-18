import type { ReportingData, ResponseRow } from "@/types/event/reporting";
export function responseCsv(rows: ResponseRow[], headers: string[]) {
  const fields = [
    ...new Map(
      rows.flatMap((r) => r.answers.map((a) => [a.fieldId, a.label] as const)),
    ).entries(),
  ];
  return csv([
    [...headers, ...fields.map(([, label]) => label)],
    ...rows.map((r) => [
      r.id,
      r.respondent,
      r.submittedAt,
      ...fields.map(
        ([id]) => r.answers.find((a) => a.fieldId === id)?.value ?? "",
      ),
    ]),
  ]);
}
export function csv(rows: (string | number)[][]) {
  return (
    "\uFEFF" +
    rows
      .map((row) =>
        row
          .map((value) => {
            const text = String(value);
            // Neutralize formulas when opening CSV in spreadsheet applications.
            return (
              '"' +
              (/^[\s]*[=+@-]/.test(text) ? "'" + text : text).replaceAll(
                '"',
                '""',
              ) +
              '"'
            );
          })
          .join(","),
      )
      .join("\r\n")
  );
}
export function download(
  content: string,
  name: string,
  type = "text/csv;charset=utf-8",
) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function approvedResponses(data: ReportingData) {
  return data.responses.filter((r) =>
    data.forms.some((f) => f.id === r.formId && f.approved),
  );
}
