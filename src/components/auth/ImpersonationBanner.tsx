"use client";

import Button from "@/components/ui/button/Button";
import { useAuth } from "@/context/AuthContext";
import { useConfirm } from "@/hooks/useConfirm";
import { showToast } from "@/utils/alert";
import { useTranslations } from "next-intl";

/** Banner while a platform admin inspects an event workspace. */
export default function ImpersonationBanner({
  beforeLeave,
}: {
  beforeLeave?: () => boolean | Promise<boolean>;
}) {
  const t = useTranslations("eventInspection");
  const tc = useTranslations("confirm");
  const {
    isInspectingEvent,
    inspectedEventName,
    realUser,
    stopInspectingEvent,
  } = useAuth();
  const { confirm } = useConfirm();

  if (!isInspectingEvent || !realUser) return null;

  const handleStop = async () => {
    const confirmed = await confirm({
      title: tc("stopInspectTitle"),
      message: t("confirmStop"),
      confirmLabel: t("stop"),
      variant: "warning",
    });
    if (!confirmed || (beforeLeave && !(await beforeLeave()))) return;
    try {
      await stopInspectingEvent();
    } catch {
      showToast({ title: t("stopFailed"), variant: "error" });
    }
  };

  return (
    <div className="border-b border-warning-200 bg-warning-50 px-4 py-3 dark:border-warning-500/20 dark:bg-warning-500/10">
      <div className="mx-auto flex max-w-(--breakpoint-2xl) flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-warning-800 dark:text-warning-400">
          {t("banner", {
            event: inspectedEventName ?? t("unnamedEvent"),
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
