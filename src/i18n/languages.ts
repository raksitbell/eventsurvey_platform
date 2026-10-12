import { ThFlagIcon, UsFlagIcon } from "@/icons";

import type { Locale } from "./routing";

export interface Language {
  id: Locale;
  name: string;
  shortName: string;
  dir: "ltr" | "rtl";
  FlagIcon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  badge?: string;
}

export const languages: Language[] = [
  {
    id: "th",
    name: "ไทย",
    shortName: "ไทย",
    dir: "ltr",
    FlagIcon: ThFlagIcon,
  },
  {
    id: "en",
    name: "English",
    shortName: "EN",
    dir: "ltr",
    FlagIcon: UsFlagIcon,
  },
];

export function getLanguage(locale: Locale): Language {
  return languages.find((l) => l.id === locale) || languages[0];
}

export function isRtl(locale: Locale): boolean {
  return getLanguage(locale).dir === "rtl";
}
