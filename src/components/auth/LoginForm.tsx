"use client";

import AuthBrandPanel from "@/components/auth/AuthBrandPanel";
import LoginTrialAccountPicker from "./LoginTrialAccountPicker";
import Checkbox from "@/components/form/input/Checkbox";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { useAuth } from "@/context/AuthContext";
import { PUBLISHED_DEMO_PASSWORD } from "@/core/auth/demo-preset";
import { getSavedPassword } from "@/core/auth/saved-password";
import { Link } from "@/i18n/navigation";
import type { LoginTrialAccount } from "@/types/auth";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type FormEvent } from "react";

export default function LoginForm() {
  const t = useTranslations("auth");
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [needsTrialPassword, setNeedsTrialPassword] = useState(false);
  const lookup = useRef<AbortController | null>(null);
  const selectedTrialEmail = useRef<string | null>(null);

  useEffect(() => () => lookup.current?.abort(), []);

  async function selectTrial(account: LoginTrialAccount) {
    lookup.current?.abort();
    selectedTrialEmail.current = account.email;
    setEmail(account.email);
    setShowPassword(false);
    setError(null);
    setNeedsTrialPassword(false);

    const submit = globalThis.document.getElementById("login-submit");
    if (account.usesPublishedPassword) {
      setPassword(PUBLISHED_DEMO_PASSWORD);
      submit?.focus();
      return;
    }

    setPassword("");
    const input = globalThis.document.getElementById("login-password");
    input?.focus();
    const request = new AbortController();
    lookup.current = request;
    const saved = await getSavedPassword(account.email, request.signal);
    if (request.signal.aborted) return;
    if (saved) {
      setPassword(saved);
      if (globalThis.document.activeElement === input) submit?.focus();
    } else {
      setNeedsTrialPassword(true);
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    lookup.current?.abort();
    setError(null);
    setIsSubmitting(true);

    try {
      const fields = new FormData(event.currentTarget);
      await login(
        String(fields.get("email") ?? "").trim(),
        String(fields.get("password") ?? ""),
      );
    } catch (err) {
      const code = err instanceof Error ? err.message : "UNKNOWN";
      let message = t("errors.generic");
      if (code === "INVALID_CREDENTIALS")
        message = t("errors.invalidCredentials");
      if (code === "UNSUPPORTED_ROLE") message = t("errors.unsupportedRole");
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <AuthBrandPanel headline={t("brandHeadline")} />

      <div className="flex min-h-dvh w-full flex-col bg-white px-6 py-10 lg:w-1/2 lg:px-16 xl:px-24 dark:bg-gray-900">
        <div className="mx-auto flex w-full max-w-auth-form flex-1 flex-col justify-center">
          <div className="mb-10">
            <h1 className="text-2xl font-bold text-event-display-text dark:text-white">
              {t("title")}
            </h1>
            <p className="mt-4 text-sm text-event-display-muted dark:text-gray-300">
              {t("trial.intro")}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="login-email" className="text-portal-label!">
                {t("trial.emailLabel")}
              </Label>
              <LoginTrialAccountPicker
                email={email}
                disabled={isSubmitting}
                onSelect={(account) => void selectTrial(account)}
              >
                <Input
                  id="login-email"
                  type="email"
                  name="email"
                  placeholder={t("emailPlaceholder")}
                  value={email}
                  onChange={(e) => {
                    lookup.current?.abort();
                    if (
                      selectedTrialEmail.current !== null &&
                      selectedTrialEmail.current !== e.target.value
                    ) {
                      selectedTrialEmail.current = null;
                      setPassword("");
                      setShowPassword(false);
                      setNeedsTrialPassword(false);
                    }
                    setEmail(e.target.value);
                  }}
                  className="rounded-xl! border-event-display-tint! bg-event-page! pe-14! text-portal-body! dark:border-gray-700! dark:bg-gray-900!"
                  required
                  autoComplete="username"
                />
              </LoginTrialAccountPicker>
            </div>

            <div>
              <Label htmlFor="login-password" className="text-portal-label!">
                {t("password")}
              </Label>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder={t("passwordPlaceholder")}
                  value={password}
                  onChange={(e) => {
                    lookup.current?.abort();
                    setNeedsTrialPassword(false);
                    setPassword(e.target.value);
                  }}
                  className="border-event-border! bg-event-page! pe-12! text-portal-body! dark:border-gray-700! dark:bg-gray-900!"
                  required
                  autoComplete="current-password"
                  aria-describedby={
                    needsTrialPassword ? "trial-password-hint" : undefined
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute end-4 top-1/2 z-30 -translate-y-1/2 cursor-pointer"
                  aria-label={
                    showPassword ? t("hidePassword") : t("showPassword")
                  }
                >
                  {showPassword ? (
                    <EyeIcon className="size-5 text-gray-500 dark:text-gray-400" />
                  ) : (
                    <EyeSlashIcon className="size-5 text-gray-500 dark:text-gray-400" />
                  )}
                </button>
              </div>
              {needsTrialPassword && (
                <p
                  id="trial-password-hint"
                  className="mt-1.5 text-theme-xs text-gray-500 dark:text-gray-400"
                >
                  {t("trial.enterPassword")}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between gap-3">
              <Checkbox
                label={t("keepLoggedIn")}
                checked={rememberMe}
                onChange={setRememberMe}
              />
              <Link
                href="/forgot-password"
                className="text-portal-label font-medium text-event-action hover:underline dark:text-purple-200"
              >
                {t("forgotPassword")}
              </Link>
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-portal-label text-error-600 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400"
              >
                {error}
              </p>
            )}

            <Button
              id="login-submit"
              type="submit"
              className="w-full rounded-xl! bg-event-sidebar-active! py-3.5! text-portal-body! hover:opacity-90"
              size="md"
              disabled={isSubmitting}
            >
              {isSubmitting ? t("signingIn") : t("signIn")}
            </Button>
          </form>

          <p className="mt-8 text-center text-portal-label text-gray-500 dark:text-gray-400">
            <button
              type="button"
              className="font-medium text-gray-600 hover:text-brand-500 dark:text-gray-300 dark:hover:text-brand-400"
            >
              {t("privacy")}
            </button>
          </p>
        </div>
      </div>
    </>
  );
}
