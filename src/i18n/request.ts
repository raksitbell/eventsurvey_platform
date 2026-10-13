import { getRequestConfig } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";

import { type Locale, routing } from "./routing";

/**
 * locale มาจาก next/root-params ซึ่งอ่านค่า `[locale]` segment ได้โดยตรง
 * ไม่ใช่ `requestLocale` ของ next-intl ที่ deprecated แล้ว ด้วยเหตุนี้แต่ละ
 * หน้าจึงไม่ต้องเรียก setRequestLocale() อีก (ถ้าเห็นในตัวอย่างบนเว็บ
 * next-intl ให้ข้ามไป — ไม่ได้ลืมใส่)
 *
 * `override` คือค่าที่ส่งตรงมาจาก getTranslations({ locale }) ซึ่งต้องชนะ
 * ค่าจาก segment เสมอ ส่วนค่าที่ไม่อยู่ใน routing.locales จะถูกแทนด้วย
 * defaultLocale เพราะ `[locale]` ทำตัวเป็น catch-all ของ path ที่ไม่รู้จัก
 */
export default getRequestConfig(async ({ locale: override }) => {
  const requested = override ?? (await rootLocale());
  const locale = routing.locales.includes(requested as Locale)
    ? (requested as Locale)
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
