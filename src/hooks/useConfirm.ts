"use client";

import { showConfirm, type ConfirmOptions } from "@/utils/confirm";
import { useCallback } from "react";
import { useTranslations } from "next-intl";

export type { ConfirmOptions };

export function useConfirm() {
  const t = useTranslations("confirm");

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      showConfirm({
        ...options,
        cancelLabel: options.cancelLabel ?? t("cancel"),
        confirmLabel: options.confirmLabel ?? t("confirm"),
      }),
    [t],
  );

  return { confirm };
}
