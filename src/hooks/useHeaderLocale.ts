"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

interface PendingFragment {
  locale: Locale;
  pathname: string;
  search: string;
  hash: string;
}

// A locale change can remount the header before the navigation finishes.
let pendingFragment: PendingFragment | null = null;

export default function useHeaderLocale(locale: Locale) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!pendingFragment) return;
    const { search, hash, pathname: browserPathname } = window.location;
    if (
      pathname !== pendingFragment.pathname ||
      search !== pendingFragment.search
    ) {
      pendingFragment = null;
      return;
    }
    if (locale !== pendingFragment.locale) return;

    const fragment = pendingFragment.hash;
    pendingFragment = null;
    // The locale-prefix redirect can drop the fragment from the canonical URL.
    if (!hash) {
      window.history.replaceState(null, "", browserPathname + search + fragment);
    }
  }, [locale, pathname]);

  return (nextLocale: Locale) => {
    if (nextLocale === locale) return;

    const { search, hash } = window.location;
    pendingFragment = hash ? { locale: nextLocale, pathname, search, hash } : null;
    router.replace(pathname + search + hash, { locale: nextLocale });
  };
}
