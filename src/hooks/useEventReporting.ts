"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { useAuth } from "@/context/AuthContext";
import { api, ApiError } from "@/core/api";
import type { ExportSummary, ReportingData } from "@/types/event/reporting";

export function useEventReporting(view?: "responses", formId?: string | null) {
  const query = new URLSearchParams();
  if (view) query.set("view", view);
  if (formId) query.set("formId", formId);
  return useReportRequest<ReportingData>("/event/data", query.toString());
}

export function useExportSummary() {
  return useReportRequest<ExportSummary>("/event/exports");
}

function useReportRequest<T>(endpoint: string, query = "") {
  const locale = useLocale();
  const { user, realUser, isInspectingEvent } = useAuth();
  const [state, setState] = useState<{
    key: string;
    data: T | null;
    errorStatus: number | null;
  }>({ key: "", data: null, errorStatus: null });
  const [version, setVersion] = useState(0);
  const identityKey = JSON.stringify([
    user?.id,
    user?.role,
    realUser?.id,
    isInspectingEvent,
  ]);
  const key = JSON.stringify([identityKey, endpoint, query, locale, version]);

  useEffect(() => {
    let active = true;
    api.get<T>(`${endpoint}?locale=${locale}&${query}`).then(
      (data) => {
        if (active) setState({ key, data, errorStatus: null });
      },
      (error: unknown) => {
        if (active) {
          setState({
            key,
            data: null,
            errorStatus: error instanceof ApiError ? error.status : 500,
          });
        }
      },
    );
    return () => {
      active = false;
    };
  }, [key, locale, endpoint, query]);

  return {
    identityKey,
    data: state.key === key ? state.data : null,
    errorStatus: state.key === key ? state.errorStatus : null,
    reload: () => setVersion((value) => value + 1),
  };
}
