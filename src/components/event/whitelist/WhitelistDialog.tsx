"use client";
import { Modal } from "@/components/ui/modal";
import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
interface WhitelistDialogProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  compact?: boolean;
}
export default function WhitelistDialog({
  title,
  onClose,
  children,
  compact = false,
}: WhitelistDialogProps) {
  const titleId = useId(),
    panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = globalThis.document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLElement>("input, button")?.focus();
    return () => previous?.focus();
  }, []);
  return (
    <Modal
      isOpen
      onClose={onClose}
      showCloseButton={false}
      labelledBy={titleId}
      backdropClassName="bg-black/50"
      className={`${compact ? "max-w-whitelist-entry" : "max-w-event-confirm"} max-h-full overflow-y-auto rounded-2xl border border-preview-border p-7 shadow-none dark:border-gray-700`}
    >
      <div
        ref={panel}
        className="space-y-4"
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
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
        <h2
          id={titleId}
          className="text-event-confirm-title font-bold text-gray-900 dark:text-gray-100"
        >
          {title}
        </h2>
        {children}
      </div>
    </Modal>
  );
}
