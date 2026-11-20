"use client";

import RowActionsMenu, { type RowAction } from "@/components/ui/dropdown/RowActionsMenu";
import type {
  AdminEventListItem,
  AdminEventStatusAction,
} from "@/types/admin/events";
import {
  ArrowTopRightOnSquareIcon,
  EyeIcon,
  PencilSquareIcon,
  PlayIcon,
  StopIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useFormatter, useTranslations } from "next-intl";

type EventActionsMenuProps = {
  event: AdminEventListItem;
  canManage: boolean;
  canInspect: boolean;
  busy: boolean;
  onInspect: () => void;
  onChangeStatus: (action: AdminEventStatusAction) => void;
  onDelete: () => void;
};

export default function EventActionsMenu({
  event,
  canManage,
  canInspect,
  busy,
  onInspect,
  onChangeStatus,
  onDelete,
}: EventActionsMenuProps) {
  const t = useTranslations("adminEvents");
  const formatter = useFormatter();
  const permissionReason = canManage ? undefined : t("menu.managePermission");
  const draftReason =
    event.status === "draft" ? undefined : t("menu.draftOnly");
  const path = `/admin/events/${encodeURIComponent(event.id)}`;
  const actions: RowAction[] = [
    { label: t("view"), icon: EyeIcon, href: path },
    {
      label: t("edit"),
      icon: PencilSquareIcon,
      href: `${path}/edit`,
      reason: permissionReason ?? draftReason,
    },
    {
      label: t("openWorkspace"),
      icon: ArrowTopRightOnSquareIcon,
      run: onInspect,
      reason: canInspect ? undefined : t("menu.inspectPermission"),
    },
  ];
  if (event.status === "scheduled") {
    let startReason = permissionReason;
    if (!startReason && !event.canStart) {
      const start = Date.parse(event.startsAt ?? "");
      startReason = Number.isFinite(start)
        ? t("menu.startAvailableAt", {
            time: formatter.dateTime(start, {
              dateStyle: "medium",
              timeStyle: "short",
              timeZone: "Asia/Bangkok",
              hourCycle: "h23",
            }),
          })
        : t("menu.missingStartTime");
    }
    actions.push({
      label: t("start"),
      icon: PlayIcon,
      run: () => onChangeStatus("start"),
      reason: startReason,
    });
  }
  if (event.status === "open") {
    actions.push({
      label: t("menu.closeEvent"),
      icon: StopIcon,
      run: () => onChangeStatus("close"),
      reason: permissionReason,
    });
  }
  const deleteReasons = {
    draft: undefined,
    scheduled: draftReason,
    open: t("menu.deleteActiveReason"),
    closed: t("menu.deleteClosedReason"),
  };
  actions.push({
    label: t("menu.deleteEvent"),
    icon: TrashIcon,
    run: onDelete,
    danger: true,
    reason: permissionReason ?? deleteReasons[event.status],
  });

  return (
    <RowActionsMenu
      label={t("menu.actionsFor", { title: event.title })}
      actions={actions}
      busy={busy}
    />
  );
}
