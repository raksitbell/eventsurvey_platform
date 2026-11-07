import type { MockEventStatus } from "@/types/mock";
import { useTranslations } from "next-intl";

const STATUS_CLASS: Record<MockEventStatus, string> = {
  draft:
    "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400",
  scheduled:
    "bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400",
  open:
    "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400",
  closed:
    "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300",
};

export default function EventStatusBadge({
  status,
}: {
  status: MockEventStatus;
}) {
  const t = useTranslations("adminEvents.status");
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-theme-xs font-medium ${STATUS_CLASS[status]}`}
    >
      {t(status)}
    </span>
  );
}
