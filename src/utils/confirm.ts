"use client";

import Swal from "sweetalert2";

export interface ConfirmOptions {
  title: string;
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
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "primary",
}: ConfirmOptions): Promise<boolean> {
  const result = await Swal.fire({
    title,
    text: message,
    icon: variant === "danger" ? "warning" : variant === "warning" ? "question" : "question",
    iconColor: variantIconColor[variant],
    showCancelButton: true,
    reverseButtons: true,
    focusCancel: true,
    confirmButtonText: confirmLabel,
    cancelButtonText: cancelLabel,
    buttonsStyling: false,
    heightAuto: false,
    customClass: {
      container: "es-swal-container",
      popup: "es-swal-popup",
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
