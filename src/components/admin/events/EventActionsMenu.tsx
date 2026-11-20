"use client";

import { Link } from "@/i18n/navigation";
import type {
  AdminEventListItem,
  AdminEventStatusAction,
} from "@/types/admin/events";
import {
  ArrowTopRightOnSquareIcon,
  EllipsisHorizontalIcon,
  EyeIcon,
  PencilSquareIcon,
  PlayIcon,
  StopIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

type MenuAction = {
  label: string;
  icon: typeof EyeIcon;
  href?: string;
  run?: () => void;
  reason?: string;
  danger?: boolean;
};

type EventActionsMenuProps = {
  event: AdminEventListItem;
  canManage: boolean;
  canInspect: boolean;
  busy: boolean;
  onInspect: () => void;
  onChangeStatus: (action: AdminEventStatusAction) => void;
  onDelete: () => void;
};

function positionMenu(panel: HTMLElement, trigger: HTMLElement) {
  const gap = 4;
  const rect = trigger.getBoundingClientRect();
  const end =
    globalThis.getComputedStyle(trigger).direction === "rtl"
      ? rect.left
      : rect.right - panel.offsetWidth;
  const below = globalThis.innerHeight - rect.bottom;
  const top =
    panel.offsetHeight + gap > below && rect.top > below
      ? rect.top - panel.offsetHeight - gap
      : rect.bottom + gap;
  panel.style.left =
    Math.max(
      gap,
      Math.min(end, globalThis.innerWidth - panel.offsetWidth - gap),
    ) + "px";
  panel.style.top =
    Math.max(
      gap,
      Math.min(top, globalThis.innerHeight - panel.offsetHeight - gap),
    ) + "px";
}

function handleMenuKeys(event: KeyboardEvent<HTMLDivElement>) {
  const panel = event.currentTarget;
  const items = Array.from(
    panel.querySelectorAll<HTMLElement>('[role="menuitem"]'),
  );
  const index = items.indexOf(panel.ownerDocument.activeElement as HTMLElement);
  let next: number;
  switch (event.key) {
    case "ArrowDown":
      next = (index + 1) % items.length;
      break;
    case "ArrowUp":
      next = (index + items.length - 1) % items.length;
      break;
    case "Home":
      next = 0;
      break;
    case "End":
      next = items.length - 1;
      break;
    case " ": {
      event.preventDefault();
      items[index]?.click();
      return;
    }
    default:
      return;
  }
  event.preventDefault();
  items[next]?.focus();
}

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
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const focusLast = useRef(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const dismiss = (e: globalThis.Event) => {
      if (
        e.target instanceof globalThis.Node &&
        panel.current?.contains(e.target)
      )
        return;
      panel.current?.hidePopover();
    };
    globalThis.addEventListener("resize", dismiss);
    globalThis.addEventListener("scroll", dismiss, true);
    return () => {
      globalThis.removeEventListener("resize", dismiss);
      globalThis.removeEventListener("scroll", dismiss, true);
    };
  }, [open]);

  const permissionReason = canManage ? undefined : t("menu.managePermission");
  const draftReason =
    event.status === "draft" ? undefined : t("menu.draftOnly");
  const path = `/admin/events/${encodeURIComponent(event.id)}`;
  const actions: MenuAction[] = [
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

  const closeMenu = () => {
    panel.current?.hidePopover();
    trigger.current?.focus({ preventScroll: true });
  };
  const label = t("menu.actionsFor", { title: event.title });

  return (
    <>
      <button
        ref={trigger}
        type="button"
        popoverTarget={id}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={id}
        disabled={busy}
        onKeyDown={(e) => {
          if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
          e.preventDefault();
          focusLast.current = e.key === "ArrowUp";
          panel.current?.showPopover();
        }}
        className="inline-flex size-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-brand-500 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
      >
        <EllipsisHorizontalIcon aria-hidden="true" className="size-5" />
      </button>
      <div
        id={id}
        ref={panel}
        popover="auto"
        role="menu"
        aria-label={label}
        onToggle={(e) => {
          const opened = e.newState === "open";
          setOpen(opened);
          if (!opened || !trigger.current) return;
          positionMenu(e.currentTarget, trigger.current);
          const items =
            e.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]');
          items[focusLast.current ? items.length - 1 : 0]?.focus({
            preventScroll: true,
          });
          focusLast.current = false;
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            closeMenu();
            return;
          }
          if (e.key === "Tab") {
            closeMenu();
            return;
          }
          handleMenuKeys(e);
        }}
        onBlur={(e) => {
          if (
            e.relatedTarget &&
            !e.currentTarget.contains(e.relatedTarget) &&
            e.relatedTarget !== trigger.current
          ) {
            e.currentTarget.hidePopover();
          }
        }}
        className="fixed inset-auto m-0 max-h-[95dvh] w-64 max-w-[95vw] overflow-y-auto rounded-xl border border-gray-100 bg-white py-1.5 text-start shadow-theme-lg dark:border-gray-700 dark:bg-gray-800"
      >
        {actions.map(
          (
            { label: actionLabel, icon: Icon, href, reason, run, danger },
            index,
          ) => {
            const style = reason
              ? "cursor-not-allowed text-gray-500 dark:text-gray-400"
              : danger
                ? "text-error-600 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-950/30"
                : "text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700";
            const className = `flex w-full items-start gap-2 px-3.5 py-2 text-start text-theme-xs font-medium focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-500 ${style}`;
            const reasonId = `${id}-reason-${index}`;
            const content = (
              <>
                <Icon aria-hidden="true" className="size-4 shrink-0" />
                <span>
                  {actionLabel}
                  {reason && (
                    <span id={reasonId} className="mt-0.5 block font-normal">
                      {reason}
                    </span>
                  )}
                </span>
              </>
            );
            if (href && !reason) {
              return (
                <Link
                  key={actionLabel}
                  role="menuitem"
                  tabIndex={-1}
                  href={href}
                  onClick={closeMenu}
                  className={className}
                >
                  {content}
                </Link>
              );
            }
            return (
              <button
                key={actionLabel}
                type="button"
                role="menuitem"
                tabIndex={-1}
                aria-label={actionLabel}
                aria-disabled={reason ? true : undefined}
                aria-describedby={reason ? reasonId : undefined}
                onClick={() => {
                  if (reason) return;
                  closeMenu();
                  run?.();
                }}
                className={className}
              >
                {content}
              </button>
            );
          },
        )}
      </div>
    </>
  );
}
