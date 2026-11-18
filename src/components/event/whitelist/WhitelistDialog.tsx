"use client";

import { Modal } from "@/components/ui/modal";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import "./whitelist-dialog.css";

interface WhitelistDialogProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export default function WhitelistDialog({
  title,
  onClose,
  children,
}: WhitelistDialogProps) {
  const t = useTranslations("eventWhitelist");
  const titleId = useId(),
    panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = globalThis.document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLElement>("button:not(:disabled)")?.focus();
    return () => previous?.focus();
  }, []);
  return (
    <Modal
      isOpen
      onClose={onClose}
      showCloseButton={false}
      labelledBy={titleId}
      backdropClassName="bg-black/50"
      className="whitelist-import-dialog max-w-[960px] p-0"
    >
      <div
        ref={panel}
        className="whitelist-import-dialog__inner"
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const controls = panel.current?.querySelectorAll<HTMLElement>(
            "input:not(:disabled):not([hidden]), button:not(:disabled)",
          );
          if (!controls?.length) return;
          const first = controls[0],
            last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }}
      >
        <header className="whitelist-import-header">
          <h2 id={titleId}>{title}</h2>
          <button type="button" onClick={onClose} aria-label={t("close")}>
            <Image
              alt=""
              src="/images/event-whitelist/close.svg"
              width={24}
              height={24}
            />
          </button>
        </header>
        {children}
      </div>
    </Modal>
  );
}
