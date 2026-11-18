"use client";

import Swal from "sweetalert2";

export function showToast(message: string, icon: "success" | "error" | "info" = "success") {
  const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.onmouseenter = Swal.stopTimer;
      toast.onmouseleave = Swal.resumeTimer;
    },
    customClass: {
      popup: "es-swal-toast-popup",
    },
  });

  return Toast.fire({
    icon,
    title: message,
  });
}
