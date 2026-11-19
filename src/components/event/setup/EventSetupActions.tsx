"use client";

import Button from "@/components/ui/button/Button";
import { ExclamationCircleIcon } from "@heroicons/react/24/outline";
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
  error?: string | {
    title: string;
    message: string;
    action?: { label: string; onClick: () => void; disabled?: boolean };
  };
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
      {typeof error === "string" && error && (
        <p
          role="alert"
          className="text-end text-theme-sm text-error-600 dark:text-error-400"
        >
          {error}
        </p>
      )}
      {error && typeof error === "object" && (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-3 rounded-xl border border-error-200 bg-error-50 p-4 text-start dark:border-error-500/30 dark:bg-error-500/10"
        >
          <div className="flex min-w-0 flex-auto items-start gap-3 sm:flex-1">
            <ExclamationCircleIcon aria-hidden="true" className="size-5 shrink-0 text-error-600 dark:text-error-400" />
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 dark:text-white">{error.title}</p>
              <p className="mt-1 text-theme-sm text-gray-700 dark:text-gray-300">{error.message}</p>
            </div>
          </div>
          {error.action && (
            <Button size="sm" variant="outline" onClick={error.action.onClick} disabled={error.action.disabled}>
              {error.action.label}
            </Button>
          )}
        </div>
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
