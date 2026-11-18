"use client";

import Button from "@/components/ui/button/Button";
import type { ReactNode } from "react";

interface EventSetupActionsProps {
  back: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
  };
  primary: {
    label: string;
    disabled?: boolean;
    wide?: boolean;
  };
  error?: string;
  saveDraft?: { label: string; onClick: () => void; disabled?: boolean };
  regularWeight?: boolean;
  children?: ReactNode;
}

export default function EventSetupActions({
  back,
  primary,
  error,
  saveDraft,
  regularWeight = false,
  children,
}: EventSetupActionsProps) {
  const weight = regularWeight ? "font-normal!" : "font-bold!";
  return (
    <footer
      className={
        saveDraft
          ? "es-setup-actionbar sticky bottom-0 z-9 mt-auto bg-white dark:bg-gray-900"
          : "mt-auto space-y-3"
      }
    >
      {error && (
        <p
          role="alert"
          className="text-end text-theme-sm text-error-600 dark:text-error-400"
        >
          {error}
        </p>
      )}
      {children}
      <div
        className={
          saveDraft
            ? "grid gap-2 sm:grid-cols-3"
            : "flex flex-wrap justify-end gap-3"
        }
      >
        <Button
          variant="outline"
          onClick={back.onClick}
          disabled={back.disabled}
          className={`h-10 ${saveDraft ? "w-full" : "w-36"} rounded-preview-control! border border-event-action bg-white! px-4! py-2! text-theme-xs! text-event-action! ring-0! dark:border-brand-400 dark:bg-gray-900! dark:text-brand-400! ${weight}`}
        >
          {back.label}
        </Button>
        {saveDraft && (
          <Button
            variant="outline"
            className="h-10"
            onClick={saveDraft.onClick}
            disabled={saveDraft.disabled}
          >
            {saveDraft.label}
          </Button>
        )}
        <Button
          type="submit"
          disabled={primary.disabled}
          className={`h-10 rounded-preview-control! bg-event-action! px-4! py-2! text-theme-xs! text-white shadow-none! hover:bg-event-action/90! dark:bg-event-action! dark:hover:bg-event-action/90! ${saveDraft ? "w-full" : primary.wide ? "w-55" : "w-36"} ${weight}`}
        >
          {primary.label}
        </Button>
      </div>
    </footer>
  );
}
