"use client";

import { useEffect } from "react";
import { useEventNavigationGuard } from "@/components/event/workspace/EventNavigationGuard";

interface HistoryTraversal extends Event {
  navigationType: string;
  destination: { key: string; url: string; sameDocument: boolean };
  hashChange: boolean;
  info: unknown;
}

interface BrowserNavigation extends EventTarget {
  traverseTo(
    key: string,
    options: { info: symbol },
  ): { committed: Promise<unknown>; finished: Promise<unknown> };
}

export default function useWhitelistNavigationGuard(
  dirty: boolean,
  confirmLeave: () => Promise<boolean>,
) {
  const guardRef = useEventNavigationGuard();

  useEffect(() => {
    if (!dirty) return;
    if (guardRef) guardRef.current = confirmLeave;

    const beforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    globalThis.addEventListener("beforeunload", beforeUnload);

    const navigation = (
      globalThis as typeof globalThis & { navigation?: BrowserNavigation }
    ).navigation;
    const confirmed = Symbol();
    let active = true;
    const beforeHistoryTraversal = (event: Event) => {
      const { navigationType, destination, hashChange, info } =
        event as HistoryTraversal;
      // Leave app links to Next's onNavigate handler and document exits to the browser.
      if (
        !navigation ||
        !event.cancelable ||
        navigationType !== "traverse" ||
        !destination.sameDocument ||
        destination.url === globalThis.location.href ||
        hashChange ||
        info === confirmed
      )
        return;

      event.preventDefault();
      void confirmLeave().then((approved) => {
        if (!approved || !active) return;
        const { committed, finished } = navigation.traverseTo(destination.key, {
          info: confirmed,
        });
        return Promise.allSettled([committed, finished]);
      });
    };
    navigation?.addEventListener("navigate", beforeHistoryTraversal);

    return () => {
      active = false;
      if (guardRef?.current === confirmLeave) guardRef.current = null;
      navigation?.removeEventListener("navigate", beforeHistoryTraversal);
      globalThis.removeEventListener("beforeunload", beforeUnload);
    };
  }, [confirmLeave, dirty, guardRef]);
}
