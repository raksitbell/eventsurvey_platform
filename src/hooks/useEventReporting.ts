"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { useAuth } from "@/context/AuthContext";
import { api, ApiError } from "@/core/api";
import type { ReportingData } from "@/types/event/reporting";

export function useEventReporting() {
  const locale = useLocale();
  const { user, realUser, isImpersonating } = useAuth();
  const [state, setState] = useState<{
    key: string;
    data: ReportingData | null;
    errorStatus: number | null;
  }>({ key: "", data: null, errorStatus: null });
  const [version, setVersion] = useState(0);
  const identityKey = JSON.stringify([
    user?.id,
    user?.role,
    realUser?.id,
    isImpersonating,
  ]);
  const key = JSON.stringify([identityKey, locale, version]);

  useEffect(() => {
    let active = true;
    api.get<ReportingData>(`/event/data?locale=${locale}`).then(
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
  }, [key, locale]);

  return {
    identityKey,
    data: state.key === key ? state.data : null,
    errorStatus: state.key === key ? state.errorStatus : null,
    reload: () => setVersion((value) => value + 1),
  };
}
