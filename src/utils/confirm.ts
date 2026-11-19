"use client";

import Swal from "sweetalert2";

export interface ConfirmOptions {
  title: string;
  appearance?: "default" | "event";
  subtitle?: string;
  note?: string;
  showCancel?: boolean;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "primary";
}

const variantIconColor = {
  primary: "#465fff",
  warning: "#f79009",
  danger: "#f04438",
} as const;

const variantConfirmClass = {
  primary: "es-swal-confirm-primary",
  warning: "es-swal-confirm-warning",
  danger: "es-swal-confirm-danger",
} as const;

export async function showConfirm({
  title,
  message,
  appearance = "default",
  subtitle,
  note,
  showCancel = true,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "primary",
}: ConfirmOptions): Promise<boolean> {
  const escape = (value: string) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/\n/g, "<br/>");
  const eventStyle = appearance === "event";
  const escaped = eventStyle
    ? `${subtitle ? `<p class="es-event-confirm-subtitle">${escape(subtitle)}</p>` : ""}<p>${escape(message)}</p>${note ? `<p class="es-event-confirm-note ${variant === "danger" ? "es-event-confirm-error" : ""}">${escape(note)}</p>` : ""}`
    : escape(message);

  const result = await Swal.fire({
    title,
    html: escaped,
    icon: eventStyle
      ? undefined
      : variant === "danger"
        ? "warning"
        : "question",
    iconColor: variantIconColor[variant],
    showCancelButton: showCancel,
    reverseButtons: true,
    focusCancel: true,
    confirmButtonText: confirmLabel,
    cancelButtonText: cancelLabel,
    buttonsStyling: false,
    heightAuto: false,
    ...(eventStyle ? { width: "var(--container-event-confirm)" } : {}),
    customClass: {
      container: "es-swal-container",
      popup: eventStyle ? "es-swal-popup es-swal-event" : "es-swal-popup",
      title: "es-swal-title",
      htmlContainer: "es-swal-text",
      actions: "es-swal-actions",
      confirmButton: `es-swal-btn ${variantConfirmClass[variant]}`,
      cancelButton: "es-swal-btn es-swal-cancel",
      icon: "es-swal-icon",
    },
  });

  return result.isConfirmed;
}
