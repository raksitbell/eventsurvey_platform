"use client";

import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { api } from "@/core/api";
import { LoginAccountIcon } from "@/icons";
import type {
  LoginTrialAccount,
  LoginTrialAccountsResponse,
} from "@/types/auth";
import { useTranslations } from "next-intl";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

const roleInitial = { super_admin: "A", event_owner: "E", sub_user: "S" };

export default function LoginTrialAccountPicker({
  children,
  email,
  disabled,
  onSelect,
}: {
  children: ReactNode;
  email: string;
  disabled: boolean;
  onSelect: (account: LoginTrialAccount) => void;
}) {
  const t = useTranslations("auth.trial");
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const focusOnLoad = useRef<"first" | "last" | null>(null);
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<
    LoginTrialAccount[] | "loading" | "error"
  >("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    api
      .get<LoginTrialAccountsResponse>(
        "/auth/trial-accounts",
        controller.signal,
      )
      .then(
        ({ accounts }) => {
          if (!controller.signal.aborted) setResult(accounts);
        },
        () => {
          if (!controller.signal.aborted) setResult("error");
        },
      );
    return () => controller.abort();
  }, [open, attempt]);

  useEffect(() => {
    if (!open || !Array.isArray(result) || !focusOnLoad.current) return;
    const selector =
      focusOnLoad.current === "first" ? ":first-child" : ":last-child";
    if (trigger.current === globalThis.document.activeElement) {
      list.current
        ?.querySelector<HTMLButtonElement>(`[role="option"]${selector}`)
        ?.focus();
    }
    focusOnLoad.current = null;
  }, [open, result]);

  function openPicker(focus: "first" | "last" | null = null) {
    focusOnLoad.current = focus;
    setResult("loading");
    setOpen(true);
  }

  function handleKeys(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target instanceof HTMLInputElement) return;
    if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
      trigger.current?.focus();
      return;
    }
    const target = event.target;
    const options = Array.from(
      list.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ??
        [],
    );
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        openPicker(event.key === "ArrowDown" ? "first" : "last");
        return;
      }
      if (!options.length) return;
      const index = options.findIndex((option) => option === target);
      const next =
        event.key === "ArrowDown" ? index + 1 : (index < 0 ? 0 : index) - 1;
      options.at(next % options.length)?.focus();
    } else if (
      open &&
      options.length &&
      (event.key === "Home" || event.key === "End")
    ) {
      event.preventDefault();
      options.at(event.key === "Home" ? 0 : -1)?.focus();
    }
  }

  return (
    <div
      className="relative"
      onKeyDown={handleKeys}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      {children}
      <button
        type="button"
        ref={trigger}
        aria-label={t("choose")}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openPicker())}
        className="absolute inset-y-0.5 end-0.5 flex w-11 items-center justify-center rounded-lg bg-event-tile before:absolute before:-start-0.5 before:h-6 before:border-s before:border-event-display-tint hover:bg-event-display-tint focus-visible:outline-2 focus-visible:outline-event-action dark:bg-gray-700 dark:before:border-gray-600 dark:hover:bg-gray-600"
      >
        <LoginAccountIcon
          aria-hidden="true"
          className="scale-[0.8333] dark:invert"
        />
      </button>
      <Dropdown
        isOpen={open}
        onClose={() => setOpen(false)}
        triggerRef={trigger}
        className="start-0 top-full mt-2 max-h-64 overflow-y-auto overscroll-contain rounded-xl border-event-border p-1.5"
      >
        <div
          ref={list}
          role="listbox"
          id={id}
          aria-label={t("choose")}
          aria-busy={result === "loading"}
        >
          {Array.isArray(result) &&
            result.map((account) => (
              <button
                key={account.email}
                type="button"
                role="option"
                aria-selected={email === account.email}
                onClick={() => {
                  setOpen(false);
                  onSelect(account);
                }}
                className="flex min-h-14.5 w-full items-center gap-3 rounded-lg px-2.5 py-2 text-start hover:bg-event-subtle focus-visible:bg-event-subtle focus-visible:outline-event-action aria-selected:bg-event-subtle dark:hover:bg-gray-800 dark:focus-visible:bg-gray-800 dark:aria-selected:bg-gray-800"
              >
                <span
                  aria-hidden="true"
                  className="flex size-8.5 shrink-0 items-center justify-center rounded-lg bg-event-tile text-theme-xs font-bold text-event-action dark:bg-gray-700 dark:text-purple-200"
                >
                  {roleInitial[account.role]}
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-theme-xs font-semibold text-event-display-text dark:text-white">
                    {t(account.role)}
                  </span>
                  <span className="text-theme-xs break-all text-event-display-muted dark:text-gray-300">
                    {account.email}
                  </span>
                </span>
              </button>
            ))}
        </div>
        {result === "loading" && (
          <p
            role="status"
            className="px-3 py-4 text-sm text-gray-500 dark:text-gray-300"
          >
            {t("loading")}
          </p>
        )}
        {Array.isArray(result) && !result.length && (
          <p
            role="status"
            className="px-3 py-4 text-sm text-gray-500 dark:text-gray-300"
          >
            {t("empty")}
          </p>
        )}
        {result === "error" && (
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-3 text-sm">
            <p role="alert" className="text-gray-600 dark:text-gray-300">
              {t("loadError")}
            </p>
            <button
              type="button"
              className="rounded px-2 py-1 font-medium text-event-action hover:underline dark:text-purple-200"
              onClick={() => {
                trigger.current?.focus();
                setResult("loading");
                setAttempt((count) => count + 1);
              }}
            >
              {t("retry")}
            </button>
          </div>
        )}
      </Dropdown>
    </div>
  );
}
