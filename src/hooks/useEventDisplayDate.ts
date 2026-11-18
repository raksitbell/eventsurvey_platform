import { useFormatter, useTranslations } from "next-intl";

export default function useEventDisplayDate() {
  const formatter = useFormatter();
  const labels = useTranslations("eventPublishedView");
  return (value: string | null, withYear = true) => {
    if (!value) return "—";
    const instant = new Date(value);
    const date = formatter.dateTime(instant, {
      day: "numeric",
      month: "short",
      ...(withYear ? { year: "numeric" as const } : {}),
      timeZone: "Asia/Bangkok",
    });
    const time = formatter.dateTime(instant, {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone: "Asia/Bangkok",
    });
    return withYear
      ? labels("dateTime", { date, time })
      : [date, time].join(" ");
  };
}
