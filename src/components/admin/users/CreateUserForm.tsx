"use client";

import UserFormFields, {
  needsAssignedEvent,
} from "@/components/admin/users/UserFormFields";
import Button from "@/components/ui/button/Button";
import { useAuth } from "@/context/AuthContext";
import { api, ApiError } from "@/core/api";
import { Link, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type {
  AdminUsersResponse,
  AdminUserWriteResult,
} from "@/types/admin/users";
import type { UserRole } from "@/types/user";
import { showToast } from "@/utils/alert";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useEffect, useState } from "react";

export default function CreateUserForm({ isTrial = false }: { isTrial?: boolean }) {
  const t = useTranslations("adminUsers");
  const configuration = useTranslations("platformConfiguration");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const { canManageUsers } = useAuth();
  const restricted = isTrial && !canManageUsers;
  const returnHref = isTrial ? "/admin/configuration?tab=trial-accounts" : "/admin/users";
  const submitLabel = isTrial ? configuration("addTrialAccount") : t("form.createSubmit");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("event_owner");
  const [eventId, setEventId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [events, setEvents] = useState<Array<{ id: string; title: string }>>(
    [],
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (restricted) {
      router.replace(returnHref);
      return;
    }
    const request = new AbortController();
    async function loadEvents() {
      try {
        const query = new URLSearchParams({ locale });
        if (isTrial) query.set("trial", "true");
        const data = await api.get<AdminUsersResponse>(
          `/admin/users?${query}`, request.signal,
        );
        if (!request.signal.aborted) setEvents(data.events ?? []);
      } catch {
        if (!request.signal.aborted) setEvents([]);
      }
    }
    void loadEvents();
    return () => request.abort();
  }, [isTrial, locale, restricted, returnHref, router]);

  if (restricted) return null;

  const handleRoleChange = (next: UserRole) => {
    setRole(next);
    if (!needsAssignedEvent(next)) setEventId("");
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !email.trim()) {
      showToast({ title: t("form.nameEmailRequired"), variant: "error" });
      return;
    }
    if (needsAssignedEvent(role) && !eventId) {
      showToast({ title: t("form.eventRequired"), variant: "error" });
      return;
    }
    if (password.length < 8) {
      showToast({ title: t("form.passwordTooShort"), variant: "error" });
      return;
    }
    if (password !== confirmPassword) {
      showToast({ title: t("form.passwordMismatch"), variant: "error" });
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post<AdminUserWriteResult>(
        "/admin/users",
        {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role,
          password,
          ...(isTrial ? { isTrial: true } : {}),
          ...(needsAssignedEvent(role) ? { eventId } : { eventId: null }),
        },
      );
      showToast({
        title: isTrial ? configuration("trialAccountCreated") : t("form.createSuccess"),
        variant: "success",
      });
      router.push(returnHref);
    } catch (err) {
      const code = err instanceof ApiError ? err.code : undefined;
      const message =
        code === "EMAIL_EXISTS"
          ? t("form.emailExists")
          : code === "EVENT_REQUIRED"
            ? t("form.eventRequired")
            : code === "INVALID_PASSWORD"
              ? t("form.passwordTooShort")
              : t("form.createError");
      showToast({ title: message, variant: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3"
    >
      <h2 className="mb-6 text-lg font-semibold text-gray-800 dark:text-white/90">
        {t("form.createCardTitle")}
      </h2>
      <UserFormFields
        name={name}
        email={email}
        role={role}
        eventId={eventId}
        password={password}
        confirmPassword={confirmPassword}
        events={events}
        disabled={isSubmitting}
        onNameChange={setName}
        onEmailChange={setEmail}
        onRoleChange={handleRoleChange}
        onEventChange={setEventId}
        onPasswordChange={setPassword}
        onConfirmPasswordChange={setConfirmPassword}
      />
      <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-5 dark:border-gray-800">
        <Link
          href={returnHref}
          className="inline-flex items-center rounded-lg bg-white px-5 py-3.5 text-sm font-medium text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/3"
        >
          {t("form.cancel")}
        </Link>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t("form.saving") : submitLabel}
        </Button>
      </div>
    </form>
  );
}
