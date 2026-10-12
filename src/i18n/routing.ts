import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "th"],
  defaultLocale: "th",
  localePrefix: "never",
});

export type Locale = (typeof routing.locales)[number];
