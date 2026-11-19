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
  const control = `min-h-11 rounded-preview-control! px-4! py-2! text-portal-label! ${weight}`;
  return (
    <footer className="es-setup-actionbar sticky bottom-0 z-9 mt-auto">
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
            ? "es-setup-action-buttons"
            : "flex flex-wrap justify-end gap-3"
        }
      >
        <Button
          variant="outline"
          onClick={back.onClick}
          disabled={back.disabled}
          className={`${control} ${saveDraft ? "w-full" : "w-36"} border border-event-action bg-white! text-event-action! ring-0! dark:border-brand-400 dark:bg-gray-900! dark:text-brand-400!`}
        >
          {back.label}
        </Button>
        {saveDraft && (
          <Button
            variant="outline"
            className={control}
            onClick={saveDraft.onClick}
            disabled={saveDraft.disabled}
          >
            {saveDraft.label}
          </Button>
        )}
        <Button
          type="submit"
          disabled={primary.disabled}
          className={`es-setup-primary ${control} shadow-none! ${saveDraft ? "w-full" : primary.wide ? "w-55" : "w-36"}`}
        >
          {primary.label}
        </Button>
      </div>
    </footer>
  );
}
