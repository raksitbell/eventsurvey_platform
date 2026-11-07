import type { MockAccountStatus } from "@/types/mock";
import { useTranslations } from "next-intl";

const STATUS_CLASS: Record<MockAccountStatus, string> = {
  invited:
    "bg-blue-light-50 text-blue-light-700 dark:bg-blue-light-500/15 dark:text-blue-light-400",
  active:
    "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400",
  suspended:
    "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400",
  removed:
    "bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400",
};

function isAccountStatus(value: string): value is MockAccountStatus {
  return value in STATUS_CLASS;
}

export default function UserAccountStatusBadge({
  status,
}: {
  status: string;
}) {
  const t = useTranslations("common.accountStatus");
  const safe = isAccountStatus(status) ? status : null;

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-theme-xs font-medium ${
        safe
          ? STATUS_CLASS[safe]
          : "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300"
      }`}
    >
      {safe ? t(safe) : status}
    </span>
  );
}
