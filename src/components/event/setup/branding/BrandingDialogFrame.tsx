"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/ui/modal";
import BrandingIcon from "./BrandingIcon";
import styles from "./BrandingDialog.module.css";

interface Props {
  title: string;
  variant: "banner" | "crop" | "asset" | "settings";
  onClose: () => void;
  onEscape?: () => void;
  children: ReactNode;
  actions: ReactNode;
  sidecar?: ReactNode;
  sidecarKind?: "identity" | "material";
}

export default function BrandingDialogFrame({
  title,
  variant,
  onClose,
  onEscape,
  children,
  actions,
  sidecar,
  sidecarKind,
}: Props) {
  const t = useTranslations("eventBranding");
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    closeButton.current?.focus({ preventScroll: true });
    return () => previous?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (!onEscape) return;
    function dismissEditor(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      onEscape?.();
    }
    document.addEventListener("keydown", dismissEditor, true);
    return () => document.removeEventListener("keydown", dismissEditor, true);
  }, [onEscape]);

  return (
    <Modal
      isOpen
      onClose={onClose}
      labelledBy={titleId}
      showCloseButton={false}
      backdropClassName="bg-black/50"
      className={styles.modal}
    >
      <div
        ref={panel}
        className={styles.rail}
        data-variant={variant}
        data-sidecar={!!sidecar}
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const controls = Array.from(
            panel.current?.querySelectorAll<HTMLElement>(
              'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), [tabindex="0"]',
            ) ?? [],
          ).filter(
            (control) =>
              control.getClientRects().length && control.tabIndex >= 0,
          );
          const first = controls[0],
            last = controls.at(-1);
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
      >
        <div className={styles.sheet}>
          <header className={styles.heading}>
            {variant === "settings" && (
              <BrandingIcon name="palette" size={24} />
            )}
            <h2 id={titleId}>{title}</h2>
            <button
              type="button"
              ref={closeButton}
              onClick={onClose}
              aria-label={t("close")}
            >
              <BrandingIcon name="close" />
            </button>
          </header>
          <div className={styles.body}>{children}</div>
          <footer className={styles.actions}>{actions}</footer>
        </div>
        {sidecar && (
          <aside className={styles.sidecar} data-kind={sidecarKind}>
            {sidecar}
          </aside>
        )}
      </div>
    </Modal>
  );
}
