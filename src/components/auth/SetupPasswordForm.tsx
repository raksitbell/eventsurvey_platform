"use client";

import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import Skeleton from "@/components/ui/skeleton/Skeleton";
import { api } from "@/core/api";
import {
  CheckCircleIcon,
  EyeIcon,
  EyeSlashIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { FormEvent, useEffect, useState } from "react";

type Preview = {
  userId: string;
  email: string;
  displayName: string;
};

function RequirementRow({
  met,
  label,
}: {
  met: boolean;
  label: string;
}) {
  return (
    <li
      className={`flex items-center gap-2 text-theme-xs ${
        met
          ? "text-success-600 dark:text-success-400"
          : "text-gray-500 dark:text-gray-400"
      }`}
    >
      {met ? (
        <CheckCircleIcon className="size-4 shrink-0" aria-hidden />
      ) : (
        <XCircleIcon className="size-4 shrink-0 opacity-50" aria-hidden />
      )}
      <span>{label}</span>
    </li>
  );
}

export default function SetupPasswordForm({ userId }: { userId: string }) {
  const t = useTranslations("setupPassword");
  const router = useRouter();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const hasMinLength = password.length >= 8;
  const passwordsMatch =
    confirmPassword.length > 0 && password === confirmPassword;
  const canSubmit = hasMinLength && passwordsMatch && !isSubmitting;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const data = await api.get<Preview>(
          `/auth/setup-password/${encodeURIComponent(userId)}`,
        );
        if (!cancelled) setPreview(data);
      } catch {
        if (!cancelled) setLoadError(t("errors.unavailable"));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [t, userId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!hasMinLength) {
      setError(t("errors.tooShort"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("errors.mismatch"));
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post(`/auth/setup-password/${encodeURIComponent(userId)}`, {
        password,
        confirmPassword,
      });
      router.replace("/login");
    } catch {
      setError(t("errors.saveFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="flex min-h-dvh w-full flex-col bg-white px-6 py-10 lg:w-1/2 lg:px-16 xl:px-24 dark:bg-gray-900">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
          {isLoading ? (
            <div className="space-y-5" aria-busy="true">
              <div className="space-y-2">
                <Skeleton className="h-9 w-56" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
              <Skeleton className="h-16 w-full rounded-2xl" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-11 w-full rounded-lg" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-11 w-full rounded-lg" />
              </div>
              <Skeleton className="h-11 w-full rounded-lg" />
            </div>
          ) : loadError || !preview ? (
            <div className="space-y-5">
              <div>
                <h1 className="mb-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
                  {t("unavailableTitle")}
                </h1>
                <p className="text-sm leading-6 text-gray-500 dark:text-gray-400">
                  {loadError ?? t("errors.unavailable")}
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
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <p className="mb-2 text-theme-xs font-semibold tracking-wide text-brand-500 uppercase">
                  {t("eyebrow")}
                </p>
                <h1 className="mb-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
                  {t("title")}
                </h1>
                <p className="text-sm leading-6 text-gray-500 dark:text-gray-400">
                  {t("description")}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-white/5">
                <p className="text-theme-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
                  {t("accountLabel")}
                </p>
                <p className="mt-1 truncate text-theme-sm font-semibold text-gray-900 dark:text-white">
                  {preview.displayName}
                </p>
                <p className="truncate text-theme-xs text-gray-500 dark:text-gray-400">
                  {preview.email}
                </p>
              </div>

              <div className="space-y-5">
                <div>
                  <Label>{t("password")}</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t("passwordPlaceholder")}
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="inset-e-4 absolute top-1/2 z-30 -translate-y-1/2 cursor-pointer"
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

                <div>
                  <Label>{t("confirmPassword")}</Label>
                  <div className="relative">
                    <Input
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={t("confirmPlaceholder")}
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="inset-e-4 absolute top-1/2 z-30 -translate-y-1/2 cursor-pointer"
                      aria-label={
                        showConfirm ? t("hidePassword") : t("showPassword")
                      }
                    >
                      {showConfirm ? (
                        <EyeIcon className="size-5 text-gray-500 dark:text-gray-400" />
                      ) : (
                        <EyeSlashIcon className="size-5 text-gray-500 dark:text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                <ul className="space-y-1.5 rounded-xl border border-gray-100 bg-white px-3 py-2.5 dark:border-gray-800 dark:bg-gray-900/40">
                  <RequirementRow
                    met={hasMinLength}
                    label={t("rules.minLength")}
                  />
                  <RequirementRow
                    met={passwordsMatch}
                    label={t("rules.match")}
                  />
                </ul>
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
                disabled={!canSubmit}
              >
                {isSubmitting ? t("saving") : t("submit")}
              </Button>

              <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                {t("alreadySet")}{" "}
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
          <p className="text-base leading-7 text-gray-400">
            {t("brandSubtext")}
          </p>
        </div>
      </div>
    </>
  );
}
