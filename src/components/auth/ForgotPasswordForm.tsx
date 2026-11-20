"use client";

import AuthBrandPanel from "@/components/auth/AuthBrandPanel";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { api } from "@/core/api";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { FormEvent, useState } from "react";

export default function ForgotPasswordForm() {
  const t = useTranslations("forgotPassword");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await api.post("/auth/forgot-password", { email: email.trim() });
      setSent(true);
    } catch {
      setError(t("errors.generic"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <AuthBrandPanel headline={t("brandHeadline")} />

      <div className="flex min-h-dvh w-full flex-col bg-white px-6 py-10 lg:w-1/2 lg:px-16 xl:px-24 dark:bg-gray-900">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
          {sent ? (
            <div>
              <div className="mb-8">
                <h1 className="mb-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
                  {t("sentTitle")}
                </h1>
                <p className="text-sm leading-6 text-gray-500 dark:text-gray-400">
                  {t("sentDescription")}
                </p>
              </div>
              <Link
                href="/login"
                className="inline-flex text-sm font-medium text-brand-500 hover:text-brand-600"
              >
                {t("backToLogin")}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="mb-8">
                <h1 className="mb-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
                  {t("title")}
                </h1>
                <p className="text-sm leading-6 text-gray-500 dark:text-gray-400">
                  {t("description")}
                </p>
              </div>

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

              {error ? (
                <p className="rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
                  {error}
                </p>
              ) : null}

              <Button
                type="submit"
                className="w-full !rounded-xl !bg-[var(--color-event-sidebar)] !py-3.5 hover:!opacity-90"
                size="md"
                disabled={isSubmitting}
              >
                {isSubmitting ? t("sending") : t("submit")}
              </Button>

              <p className="mt-3 text-center text-sm text-gray-500 dark:text-gray-400">
                <Link
                  href="/login"
                  className="font-medium text-brand-500 hover:text-brand-600"
                >
                  {t("backToLogin")}
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
