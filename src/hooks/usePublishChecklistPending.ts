"use client";

import { useEffect, useState } from "react";

export default function usePublishChecklistPending(loading: boolean) {
  const [minimumElapsed, setMinimumElapsed] = useState(false);
  useEffect(() => {
    const timer = globalThis.setTimeout(() => setMinimumElapsed(true), 5_000);
    return () => globalThis.clearTimeout(timer);
  }, []);
  return !minimumElapsed || loading;
}
