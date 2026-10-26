"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/core/api";
import Button from "@/components/ui/button/Button";
interface Props {
  query: string;
  busy: boolean;
  count: number;
}
export default function ExportReports({ query, busy, count }: Props) {
  const t = useTranslations("analytics"),
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  async function generate(format: "csv" | "pdf") {
    const popup = format === "pdf" ? window.open("", "_blank") : null;
    if (format === "pdf" && !popup) {
      setError(t("popupError"));
      return;
    }
    setPending(true);
    setError("");
    try {
      const result = await api.post<{
        content: string;
        mime: string;
        filename: string;
      }>(`/event/analytics/export?${query}&format=${format}`, {});
      const url = URL.createObjectURL(
        new Blob([result.content], { type: result.mime }),
      );
      if (popup) {
        popup.opener = null;
        popup.location.href = url;
      } else {
        const a = document.createElement("a");
        a.href = url;
        a.download = result.filename;
        a.click();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      popup?.close();
      setError(t("exportError"));
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <h2 className="text-lg font-semibold">{t("reports")}</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {t("exportNote", { count })}
      </p>
      <div className="flex flex-wrap gap-3">
        <Button disabled={busy || pending} onClick={() => void generate("csv")}>
          {t("csv")}
        </Button>
        <Button
          variant="outline"
          disabled={busy || pending}
          onClick={() => void generate("pdf")}
        >
          {t("pdf")}
        </Button>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">{t("pdfNote")}</p>
      {error && (
        <p role="alert" className="text-error-600 dark:text-error-400">
          {error}
        </p>
      )}
    </section>
  );
}
