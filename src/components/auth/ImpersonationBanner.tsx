"use client";

import Button from "@/components/ui/button/Button";
import { useAuth } from "@/context/AuthContext";
import { useConfirm } from "@/hooks/useConfirm";
import { translateRole } from "@/utils/i18n-labels";
import { useTranslations } from "next-intl";

export default function ImpersonationBanner() {
  const t = useTranslations("impersonation");
  const tc = useTranslations("confirm");
  const tCommon = useTranslations("common");
  const { isImpersonating, user, realUser, stopImpersonating } = useAuth();
  const { confirm } = useConfirm();

  if (!isImpersonating || !user || !realUser) return null;

  const handleStop = async () => {
    const confirmed = await confirm({
      title: tc("stopImpersonateTitle"),
      message: t("confirmStop"),
      confirmLabel: t("stop"),
      variant: "warning",
    });
    if (!confirmed) return;
    stopImpersonating();
  };

  return (
    <div className="border-b border-warning-200 bg-warning-50 px-4 py-3 dark:border-warning-500/20 dark:bg-warning-500/10">
      <div className="mx-auto flex max-w-(--breakpoint-2xl) flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-warning-800 dark:text-warning-400">
          {t("banner", {
            actingAs: user.name,
            role: translateRole(tCommon, user.role),
            admin: realUser.name,
          })}
        </p>
        <Button size="sm" variant="outline" onClick={handleStop}>
          {t("stop")}
        </Button>
      </div>
    </div>
  );
}
