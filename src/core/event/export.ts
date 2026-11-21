import type { ResponseRow } from "@/types/event/reporting";
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
export function download(content: Blob, name: string) {
  const url = URL.createObjectURL(content);
  const a = globalThis.document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
