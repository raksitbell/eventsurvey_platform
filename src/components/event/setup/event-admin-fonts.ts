import { Inter, Noto_Sans_Thai } from "next/font/google";

export const eventInter = Inter({
  subsets: ["latin"],
  variable: "--es-font-inter",
  adjustFontFallback: false,
});
export const eventThai = Noto_Sans_Thai({
  subsets: ["thai"],
  variable: "--es-font-thai",
  adjustFontFallback: false,
});
