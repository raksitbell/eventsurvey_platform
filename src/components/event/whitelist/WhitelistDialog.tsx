"use client";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/ui/modal";
import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
interface WhitelistDialogProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  compact?: boolean;
  wide?: boolean;
  inactive?: boolean;
  footer?: ReactNode;
  attentionRequest?: number;
}
export default function WhitelistDialog({
  title,
  onClose,
  children,
  compact = false,
  wide = false,
  inactive = false,
  footer,
  attentionRequest = 0,
}: WhitelistDialogProps) {
  const t = useTranslations("eventWhitelist");
  const titleId = useId(),
    panel = useRef<HTMLDivElement>(null);
  const lastAttention = useRef(0);
  useEffect(() => {
    const previous = globalThis.document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLElement>("input, button")?.focus();
    return () => previous?.focus();
  }, []);
  useEffect(() => {
    if (
      !attentionRequest ||
      inactive ||
      attentionRequest === lastAttention.current
    )
      return;
    lastAttention.current = attentionRequest;
    const dialog = panel.current?.parentElement;
    // Keep the current dialog mounted and direct keyboard users to the save action.
    panel.current
      ?.querySelector<HTMLElement>("footer button:last-child")
      ?.focus();
    if (globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches)
      return;
    const animation = dialog?.animate(
      [0, -8, 8, -6, 6, -3, 3, 0].map((offset) => ({
        transform: `translateX(${offset}px)`,
      })),
      { duration: 360, easing: "ease-in-out" },
    );
    return () => animation?.cancel();
  }, [attentionRequest, inactive]);
  return (
    <Modal
      isOpen
      inactive={inactive}
      onClose={onClose}
      showCloseButton={false}
      labelledBy={titleId}
      backdropClassName={inactive ? "bg-transparent" : "bg-overlay-scrim/50"}
      className={`${wide ? "max-w-whitelist-management overflow-hidden p-0!" : compact ? "max-w-whitelist-entry" : "max-w-event-confirm"} max-h-full rounded-2xl border border-preview-border p-7 ${wide ? "shadow-theme-md" : "overflow-y-auto shadow-none"} dark:border-gray-700`}
    >
      <div
        ref={panel}
        className={
          wide ? "flex h-165 max-h-[calc(100dvh-2rem)] flex-col" : "space-y-4"
        }
        onKeyDown={(event) => {
          if (event.key !== "Tab" || inactive) return;
          const controls = panel.current?.querySelectorAll<HTMLElement>(
            "input:not(:disabled), button:not(:disabled)",
          );
          if (!controls?.length) return;
          const first = controls[0],
            last = controls[controls.length - 1];
          if (event.shiftKey && globalThis.document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (
            !event.shiftKey &&
            globalThis.document.activeElement === last
          ) {
            event.preventDefault();
            first.focus();
          }
        }}
      >
        {attentionRequest > 0 && (
          <span key={attentionRequest} role="alert" className="sr-only">
            {t("unsavedTitle")}
          </span>
        )}
        <header
          className={
            wide
              ? "flex shrink-0 items-center justify-between gap-4 border-b border-preview-border px-5 py-5 sm:px-8 sm:py-7 dark:border-gray-700"
              : undefined
          }
        >
          <h2
            id={titleId}
            className={`${wide ? "text-2xl" : "text-event-confirm-title"} font-bold text-gray-900 dark:text-gray-100`}
          >
            {title}
          </h2>
          {wide && (
            <button
              type="button"
              aria-label={t("close")}
              onClick={onClose}
              className="flex size-11 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-event-action dark:text-gray-400 dark:hover:bg-gray-800"
            >
              <XMarkIcon className="size-6" aria-hidden="true" />
            </button>
          )}
        </header>
        {wide ? (
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-8 sm:py-5">
            {children}
          </div>
        ) : (
          children
        )}
        {footer && (
          <footer className="flex shrink-0 flex-wrap justify-end gap-3 border-t border-preview-border px-5 py-5 sm:px-8 dark:border-gray-700">
            {footer}
          </footer>
        )}
      </div>
    </Modal>
  );
}
