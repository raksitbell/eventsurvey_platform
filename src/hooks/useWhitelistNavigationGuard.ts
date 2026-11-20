"use client";

import { useEffect, useEffectEvent } from "react";
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
  const requestLeave = useEffectEvent(confirmLeave);

  useEffect(() => {
    if (!dirty) return;
    const guard = () => requestLeave();
    if (guardRef) guardRef.current = guard;

    let active = true;
    const beforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    globalThis.addEventListener("beforeunload", beforeUnload);

    const navigation = (
      globalThis as typeof globalThis & { navigation?: BrowserNavigation }
    ).navigation;
    const confirmed = Symbol();
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
      const sourceUrl = globalThis.location.href;
      void guard().then(async (approved) => {
        // Saving can clear the guard before the approved traversal resumes.
        if (!approved || globalThis.location.href !== sourceUrl) return;
        // A browser may reload the document when replaying a confirmed entry.
        const target = new URL(destination.url);
        if (target.origin !== new URL(sourceUrl).origin) return;
        globalThis.removeEventListener("beforeunload", beforeUnload);
        const { committed, finished } = navigation.traverseTo(destination.key, {
          info: confirmed,
        });
        const [commit] = await Promise.allSettled([committed, finished]);
        if (globalThis.location.href !== sourceUrl) return;
        if (commit.status === "rejected") {
          // WebKit can abort replay of a previously canceled history entry.
          globalThis.location.replace(target.href);
        } else if (active) {
          globalThis.addEventListener("beforeunload", beforeUnload);
        }
      });
    };
    navigation?.addEventListener("navigate", beforeHistoryTraversal);

    return () => {
      active = false;
      if (guardRef?.current === guard) guardRef.current = null;
      navigation?.removeEventListener("navigate", beforeHistoryTraversal);
      globalThis.removeEventListener("beforeunload", beforeUnload);
    };
  }, [dirty, guardRef]);
}
