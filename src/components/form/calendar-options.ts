import { english } from "flatpickr/dist/l10n/default";
import { Thai } from "flatpickr/dist/l10n/th";

export function calendarOptions(locale: string) {
  return {
    locale: locale === "th" ? Thai : english,
    ariaDateFormat: "j F Y",
    disableMobile: true,
    allowInput: false,
    prevArrow: "‹",
    nextArrow: "›",
  };
}
