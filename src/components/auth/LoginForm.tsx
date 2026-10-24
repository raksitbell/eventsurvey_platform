"use client";

import Checkbox from "@/components/form/input/Checkbox";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { useAuth } from "@/context/AuthContext";
import { MOCK_DEMO_PASSWORD } from "@/core/auth/constants";
import { EyeCloseIcon, EyeIcon } from "@/icons";
import { useTranslations } from "next-intl";
import { FormEvent, useState } from "react";

const DEMO_ACCOUNTS = [
  {
    key: "admin" as const,
    email: "admin@example.com",
  },
  {
    key: "owner" as const,
    email: "thanawat@example.com",
  },
  {
    key: "subUser" as const,
    email: "kittisak@example.com",
  },
];

export default function LoginForm() {
  const t = useTranslations("auth");
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fillDemoAccount = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword(MOCK_DEMO_PASSWORD);
    setError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email.trim(), password);
    } catch (err) {
      const code = err instanceof Error ? err.message : "UNKNOWN";
      if (code === "INVALID_CREDENTIALS") {
        setError(t("errors.invalidCredentials"));
      } else if (code === "UNSUPPORTED_ROLE") {
        setError(t("errors.unsupportedRole"));
      } else {
        setError(t("errors.generic"));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="flex min-h-dvh w-full flex-col bg-white px-6 py-10 lg:w-1/2 lg:px-16 xl:px-24 dark:bg-gray-900">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
          <div className="mb-8">
            <h1 className="mb-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
              {t("title")}
            </h1>
            <p className="text-sm leading-6 text-gray-500 dark:text-gray-400">
              {t("subtitle")}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label>{t("email")}</Label>
              <Input
                type="email"
                name="email"
                placeholder={t("emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <Label>{t("password")}</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder={t("passwordPlaceholder")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="inset-e-4 absolute top-1/2 z-30 -translate-y-1/2 cursor-pointer"
                  aria-label={
                    showPassword ? t("hidePassword") : t("showPassword")
                  }
                >
                  {showPassword ? (
                    <EyeIcon className="fill-gray-500 dark:fill-gray-400" />
                  ) : (
                    <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Checkbox checked={rememberMe} onChange={setRememberMe} />
                <span className="text-theme-sm text-gray-700 dark:text-gray-400">
                  {t("keepLoggedIn")}
                </span>
              </div>
              <button
                type="button"
                className="text-theme-sm font-medium text-brand-500 hover:text-brand-600"
              >
                {t("forgotPassword")}
              </button>
            </div>

            {error ? (
              <p className="rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
                {error}
              </p>
            ) : null}

            <Button
              type="submit"
              className="w-full !rounded-xl !py-3.5"
              size="md"
              disabled={isSubmitting}
            >
              {isSubmitting ? t("signingIn") : t("signIn")}
            </Button>
          </form>

          <div className="mt-8 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/5">
            <p className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
              {t("demoTitle")}
            </p>
            <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
              {t("demoHint")}
            </p>
            <ul className="mt-3 space-y-2">
              {DEMO_ACCOUNTS.map((account) => (
                <li key={account.key}>
                  <button
                    type="button"
                    onClick={() => fillDemoAccount(account.email)}
                    className="flex w-full items-start justify-between gap-3 rounded-xl border border-transparent bg-white px-3 py-2.5 text-start transition hover:border-brand-200 hover:bg-brand-25 dark:bg-gray-900 dark:hover:border-brand-500/30 dark:hover:bg-brand-500/10"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-theme-sm font-medium text-gray-800 dark:text-white/90">
                        {account.email}
                      </span>
                      <span className="mt-0.5 block text-theme-xs text-gray-500 dark:text-gray-400">
                        {t(`demoAccounts.${account.key}`)}
                      </span>
                    </span>
                    <span className="shrink-0 text-theme-xs font-medium text-brand-500">
                      {t("signIn")}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-theme-xs text-gray-500 dark:text-gray-400">
              {t("demoPassword")}
            </p>
          </div>

          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            {t("noAccount")}{" "}
            <button
              type="button"
              className="font-medium text-brand-500 hover:text-brand-600"
            >
              {t("contactAdmin")}
            </button>
          </p>
        </div>
      </div>

      <div className="relative hidden min-h-dvh w-full overflow-hidden bg-gray-950 lg:flex lg:w-1/2 lg:items-center lg:justify-center">
        <div className="absolute -start-24 -top-24 size-80 rounded-full bg-brand-600/20 blur-3xl" />
        <div className="absolute -end-16 -bottom-20 size-96 rounded-full bg-brand-500/15 blur-3xl" />
        <div className="absolute end-10 top-10 grid grid-cols-4 gap-2 opacity-40">
          {Array.from({ length: 16 }).map((_, index) => (
            <span
              key={index}
              className="size-1.5 rounded-full bg-blue-light-400/70"
            />
          ))}
        </div>

        <div className="relative z-10 mx-auto max-w-md px-10 text-center">
          <div className="mx-auto mb-8 flex size-16 items-center justify-center rounded-2xl bg-brand-500 text-2xl font-bold text-white shadow-theme-lg">
            E
          </div>
          <h2 className="mb-4 text-3xl font-bold leading-tight text-white">
            {t("brandHeadline")}
          </h2>
          <p className="text-base leading-7 text-gray-400">{t("brandSubtext")}</p>
        </div>
      </div>
    </>
  );
}
