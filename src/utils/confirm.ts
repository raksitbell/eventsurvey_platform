"use client";

import Swal from "sweetalert2";

export interface ConfirmOptions {
  title: string;
  appearance?: "default" | "event";
  layout?: "standard" | "detailed";
  subtitle?: string;
  note?: string;
  showCancel?: boolean;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "primary" | "success";
}

const variants = {
  primary: { icon: "question", color: "#465fff", button: "es-swal-confirm-primary" },
  warning: { icon: "question", color: "#f79009", button: "es-swal-confirm-warning" },
  danger: { icon: "warning", color: "#f04438", button: "es-swal-confirm-danger" },
  success: { icon: "success", color: "#12b76a", button: "es-swal-confirm-primary" },
} as const;

async function openConfirm({
  title,
  message,
  appearance = "default",
  layout = appearance === "event" ? "detailed" : "standard",
  subtitle,
  note,
  showCancel = true,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "primary",
}: ConfirmOptions, discardLabel?: string) {
  const escape = (value: string) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/\n/g, "<br/>");
  const detailed = layout === "detailed";
  const style = variants[variant];
  const eventAccent = appearance === "event" && !detailed && style.button === "es-swal-confirm-primary";
  const escaped = detailed
    ? `${subtitle ? `<p class="es-event-confirm-subtitle">${escape(subtitle)}</p>` : ""}<p>${escape(message)}</p>${note ? `<p class="es-event-confirm-note ${variant === "danger" ? "es-event-confirm-error" : ""}">${escape(note)}</p>` : ""}`
    : escape(message);

  return Swal.fire({
    title,
    html: escaped,
    icon: detailed ? undefined : style.icon,
    iconColor: eventAccent && variant === "primary" ? "var(--color-event-action)" : style.color,
    showCancelButton: showCancel,
    showDenyButton: Boolean(discardLabel),
    denyButtonText: discardLabel,
    reverseButtons: true,
    focusCancel: true,
    confirmButtonText: confirmLabel,
    cancelButtonText: cancelLabel,
    buttonsStyling: false,
    heightAuto: false,
    ...(detailed ? { width: "var(--container-event-confirm)" } : {}),
    customClass: {
      container: "es-swal-container",
      popup: detailed ? "es-swal-popup es-swal-event" : "es-swal-popup",
      title: "es-swal-title",
      htmlContainer: "es-swal-text",
      actions: discardLabel ? "es-swal-actions es-swal-save-actions" : "es-swal-actions",
      denyButton: "es-swal-btn es-swal-cancel",
      confirmButton: `es-swal-btn ${eventAccent ? "es-swal-event-accent" : style.button}`,
      cancelButton: "es-swal-btn es-swal-cancel",
      icon: "es-swal-icon",
    },
  });
}

export async function showConfirm(options: ConfirmOptions): Promise<boolean> {
  return (await openConfirm(options)).isConfirmed;
}

export async function showSaveChanges(options: ConfirmOptions & { discardLabel: string }) {
  const result = await openConfirm(options, options.discardLabel);
  if (result.isConfirmed) return "save";
  return result.isDenied ? "discard" : "cancel";
}
