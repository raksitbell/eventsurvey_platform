"use client";

import {
  CheckCircleIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";

interface WhitelistRequiredButtonProps {
  onClick: () => void;
  disabled: boolean;
  ready: boolean;
  invalid: boolean;
  storageError: boolean;
}

export default function WhitelistRequiredButton({
  onClick,
  disabled,
  ready,
  invalid,
  storageError,
}: WhitelistRequiredButtonProps) {
  const t = useTranslations("eventHome.details");
  const tone = invalid
    ? "text-error-600 dark:text-error-400"
    : ready
      ? "text-success-700 dark:text-success-400"
      : "text-gray-500 dark:text-gray-400";
  return (
    <div className="space-y-2">
      <button
        id="manage-event-whitelist"
        type="button"
        disabled={disabled}
        aria-describedby="event-whitelist-requirement"
        onClick={onClick}
        className={`flex min-h-11 w-full items-center justify-center gap-1 rounded-preview-control border bg-event-subtle px-3 text-theme-sm text-participant-text focus-visible:outline-2 focus-visible:outline-event-action disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-800 dark:text-gray-300 ${invalid ? "border-error-500 dark:border-error-400" : "border-event-action dark:border-gray-600"}`}
      >
        {t("manageWhitelist")}
        <span aria-hidden="true" className="text-error-600 dark:text-error-400">
          *
        </span>
      </button>
      <p
        id="event-whitelist-requirement"
        role={invalid ? "alert" : "status"}
        className={`flex items-start gap-1.5 text-theme-xs ${tone}`}
      >
        {ready ? (
          <CheckCircleIcon aria-hidden="true" className="size-4 shrink-0" />
        ) : invalid ? (
          <ExclamationCircleIcon
            aria-hidden="true"
            className="size-4 shrink-0"
          />
        ) : (
          <span
            aria-hidden="true"
            className="mt-0.5 size-3 shrink-0 rounded-full border border-current"
          />
        )}
        {t(
          storageError
            ? "whitelistStorageError"
            : ready
              ? "whitelistReady"
              : "whitelistRequired",
        )}
      </p>
    </div>
  );
}
