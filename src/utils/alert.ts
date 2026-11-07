"use client";

import Swal from "sweetalert2";

export type AlertVariant = "success" | "error" | "warning" | "info";

export type AlertOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: AlertVariant;
};

const variantIcon = {
  success: "success",
  error: "error",
  warning: "warning",
  info: "info",
} as const;

const variantIconColor = {
  success: "#12b76a",
  error: "#f04438",
  warning: "#f79009",
  info: "#465fff",
} as const;

const variantConfirmClass = {
  success: "es-swal-confirm-primary",
  error: "es-swal-confirm-danger",
  warning: "es-swal-confirm-warning",
  info: "es-swal-confirm-primary",
} as const;

/** Single-button SweetAlert2 dialog (success / error / info). */
export async function showAlert({
  title,
  message,
  confirmLabel = "OK",
  variant = "info",
}: AlertOptions): Promise<void> {
  const escaped = message
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\n/g, "<br/>");

  await Swal.fire({
    title,
    html: escaped,
    icon: variantIcon[variant],
    iconColor: variantIconColor[variant],
    showCancelButton: false,
    confirmButtonText: confirmLabel,
    buttonsStyling: false,
    heightAuto: false,
    customClass: {
      container: "es-swal-container",
      popup: "es-swal-popup",
      title: "es-swal-title",
      htmlContainer: "es-swal-text",
      actions: "es-swal-actions",
      confirmButton: `es-swal-btn ${variantConfirmClass[variant]}`,
      icon: "es-swal-icon",
    },
  });
}

export function showSuccess(
  title: string,
  message: string,
  confirmLabel?: string,
) {
  return showAlert({ title, message, confirmLabel, variant: "success" });
}

export function showError(
  title: string,
  message: string,
  confirmLabel?: string,
) {
  return showAlert({ title, message, confirmLabel, variant: "error" });
}
