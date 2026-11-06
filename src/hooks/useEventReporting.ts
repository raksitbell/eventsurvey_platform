"use client";
import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/core/api";
import type { ReportingData } from "@/types/event/reporting";
export function useEventReporting() {
  const locale = useLocale();
  const { user } = useAuth();
  const [state, setState] = useState<{
    key: string;
    data: ReportingData | null;
    error: boolean;
  }>({ key: "", data: null, error: false });
  const [version, setVersion] = useState(0);
  const key = `${user?.id}:${locale}:${version}`;
  useEffect(() => {
    let active = true;
    api
      .get<ReportingData>(`/event/data?locale=${locale}`)
      .then((data) => {
        if (active) setState({ key, data, error: false });
      })
      .catch(() => {
        if (active) setState({ key, data: null, error: true });
      });
    return () => {
      active = false;
    };
  }, [key, locale]);
  return {
    data: state.key === key ? state.data : null,
    error: state.key === key && state.error,
    reload: () => setVersion((v) => v + 1),
  };
}
