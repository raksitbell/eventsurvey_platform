"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { api, ApiError } from "@/core/api";
import { useAuth } from "@/context/AuthContext";
import { Link } from "@/i18n/navigation";
import type { AnalyticsData, Filters } from "@/types/event/analytics";
import Button from "@/components/ui/button/Button";
import AnalyticsFilters from "./AnalyticsFilters";
import DashboardWidgets from "./DashboardWidgets";
import ResponseTable from "./ResponseTable";
import ExportReports from "./ExportReports";
import LayoutEditor from "./LayoutEditor";
interface Props {
  view: "dashboard" | "responses" | "reports" | "builder";
}
function query(filters: Filters) {
  return new URLSearchParams({
    ...filters,
    raw: String(filters.raw),
  }).toString();
}
export default function AnalyticsWorkspace({ view }: Props) {
  const t = useTranslations("analytics"),
    locale = useLocale() as "th" | "en",
    { user } = useAuth();
  const params = useSearchParams();
  const [filters, setFilters] = useState<Filters>({
    eventId: params.get("eventId") || "",
    formId: view === "builder" ? "" : params.get("formId") || "",
    from: view === "builder" ? "" : params.get("from") || "",
    to: view === "builder" ? "" : params.get("to") || "",
    raw: view !== "builder" && params.get("raw") === "true",
    locale,
  });
  const [applied, setApplied] = useState(filters),
    [data, setData] = useState<AnalyticsData | null>(null),
    [status, setStatus] = useState<"loading" | "ready" | "error">("loading"),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0);
  const requestKey = `${user?.id}|${locale}|${query(applied)}|${revision}`;
  const [loadedKey, setLoadedKey] = useState("");
  useEffect(() => {
    let cancelled = false;
    api
      .get<AnalyticsData>(`/event/analytics?${query({ ...applied, locale })}`)
      .then(
        (result) => {
          if (!cancelled) {
            setData(result);
            setLoadedKey(requestKey);
            setStatus("ready");
            setError("");
          }
        },
        (err) => {
          if (!cancelled) {
            setData(null);
            setLoadedKey(requestKey);
            setStatus("error");
            setError(
              err instanceof ApiError && err.status === 401
                ? t("loginRequired")
                : err instanceof ApiError && err.status === 403
                  ? t("forbidden")
                  : t("loadError"),
            );
          }
        },
      );
    return () => {
      cancelled = true;
    };
  }, [applied, locale, requestKey, t]);
  const busy = loadedKey !== requestKey || status === "loading";
  const apply = () => {
    if (filters.from && filters.to && filters.from > filters.to) {
      setError(t("invalidDate"));
      return;
    }
    setError("");
    setApplied({ ...filters, locale });
  };
  const visible = data && !busy && status === "ready" ? data : null;
  if (view === "builder" && visible && visible.permissions.manage)
    return (
      <LayoutEditor data={visible} onSaved={() => setRevision((n) => n + 1)} />
    );
  return (
    <div className="space-y-6 text-gray-900 dark:text-gray-100">
      <header>
        <h1 className="text-2xl font-semibold">{t(view)}</h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {t("description")}
        </p>
      </header>
      <nav className="flex flex-wrap gap-3">
        {(["dashboard", "responses", "reports", "builder"] as const).map(
          (v) => (
            <Link
              key={v}
              href={
                (v === "dashboard"
                  ? "/event/analytics"
                  : `/event/analytics/${v}`) +
                "?" +
                query(applied)
              }
              className={`rounded-lg px-4 py-2 text-sm ${v === view ? "bg-brand-500 text-white dark:bg-brand-500 dark:text-white" : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"}`}
            >
              {t(v)}
            </Link>
          ),
        )}
      </nav>
      {data && view !== "builder" && (
        <AnalyticsFilters
          data={data}
          value={{ ...filters, eventId: data.event.id }}
          onChange={setFilters}
          onApply={apply}
          busy={busy}
        />
      )}
      {error && (
        <p
          role="alert"
          className="rounded-xl bg-error-50 p-4 text-error-700 dark:bg-error-500/10 dark:text-error-400"
        >
          {error}
        </p>
      )}
      {busy ? (
        <p role="status">{t("loading")}</p>
      ) : status === "error" ? (
        <Button onClick={() => setRevision((n) => n + 1)}>{t("retry")}</Button>
      ) : null}
      {visible && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-brand-50 p-4 text-sm text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
            <span>{visible.filters.raw ? t("rawWarning") : t("masked")}</span>
            {visible.permissions.raw && view !== "builder" && (
              <Button
                variant="outline"
                onClick={() => {
                  const next = { ...applied, raw: !applied.raw };
                  setApplied(next);
                  setFilters(next);
                }}
              >
                {visible.filters.raw ? t("mask") : t("showRaw")}
              </Button>
            )}
          </div>
          {view === "dashboard" && <DashboardWidgets data={visible} />}
          {view === "responses" && <ResponseTable data={visible} />}
          {view === "reports" && (
            <ExportReports
              query={query(visible.filters)}
              count={visible.rows.length}
              busy={busy}
            />
          )}
          {view === "builder" &&
            (visible.permissions.manage ? (
              <LayoutEditor
                data={visible}
                onSaved={() => setRevision((n) => n + 1)}
              />
            ) : (
              <p>{t("forbidden")}</p>
            ))}
        </>
      )}
    </div>
  );
}
