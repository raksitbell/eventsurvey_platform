"use client";

import AuthBrandPanel from "@/components/auth/AuthBrandPanel";
import Checkbox from "@/components/form/input/Checkbox";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { useAuth } from "@/context/AuthContext";
import { Link } from "@/i18n/navigation";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

export default function LoginForm() {
  const t = useTranslations("auth");
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email.trim(), password);
    } catch (err) {
      const code = err instanceof Error ? err.message : "UNKNOWN";
      let message = t("errors.generic");
      if (code === "INVALID_CREDENTIALS") message = t("errors.invalidCredentials");
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
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
              {t("title")}
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="login-email" className="text-portal-label!">{t("email")}</Label>
              <Input
                id="login-email"
                type="email"
                name="email"
                placeholder={t("emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="text-portal-body!"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <Label htmlFor="login-password" className="text-portal-label!">{t("password")}</Label>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder={t("passwordPlaceholder")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pe-12! text-portal-body!"
                  required
                  autoComplete="current-password"
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
            </div>

            <div className="flex items-center justify-between gap-3">
              <Checkbox label={t("keepLoggedIn")} checked={rememberMe} onChange={setRememberMe} />
              <Link
                href="/forgot-password"
                className="text-portal-label font-medium text-brand-500 hover:text-brand-600"
              >
                {t("forgotPassword")}
              </Link>
            </div>

            {error && (
              <p role="alert" className="rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-portal-label text-error-600 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full !rounded-xl !bg-[var(--color-event-sidebar)] !py-3.5 text-portal-body! hover:!opacity-90"
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
