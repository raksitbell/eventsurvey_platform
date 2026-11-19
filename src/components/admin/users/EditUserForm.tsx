"use client";

import UserFormFields, {
  needsAssignedEvent,
} from "@/components/admin/users/UserFormFields";
import Button from "@/components/ui/button/Button";
import Skeleton from "@/components/ui/skeleton/Skeleton";
import { api, ApiError } from "@/core/api";
import { Link, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type {
  AdminUserListItem,
  AdminUsersResponse,
} from "@/types/admin/users";
import type { UserRole } from "@/types/user";
import { showToast } from "@/utils/alert";
import { useLocale, useTranslations } from "next-intl";
import { FormEvent, useEffect, useState } from "react";

type Props = {
  userId: string;
};

export default function EditUserForm({ userId }: Props) {
  const t = useTranslations("adminUsers");
  const locale = useLocale() as Locale;
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("event_owner");
  const [eventId, setEventId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [events, setEvents] = useState<Array<{ id: string; title: string }>>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [detail, list] = await Promise.all([
          api.get<{ user: AdminUserListItem }>(
            `/admin/users/${encodeURIComponent(userId)}?locale=${encodeURIComponent(locale)}`,
          ),
          api.get<AdminUsersResponse>(
            `/admin/users?locale=${encodeURIComponent(locale)}`,
          ),
        ]);
        if (cancelled) return;
        setName(detail.user.name);
        setEmail(detail.user.email);
        setRole(detail.user.role);
        setEventId(detail.user.eventId ?? "");
        setEvents(list.events ?? []);
        setPassword("");
        setConfirmPassword("");
      } catch {
        if (!cancelled) setLoadError(t("loadError"));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [locale, t, userId]);

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

    const changingPassword = password.length > 0 || confirmPassword.length > 0;
    if (changingPassword) {
      if (password.length < 8) {
        showToast({ title: t("form.passwordTooShort"), variant: "error" });
        return;
      }
      if (password !== confirmPassword) {
        showToast({ title: t("form.passwordMismatch"), variant: "error" });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const body: {
        name: string;
        email: string;
        role: UserRole;
        eventId?: string | null;
        password?: string;
      } = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role,
      };
      if (role === "super_admin") {
        body.eventId = null;
      } else if (needsAssignedEvent(role)) {
        body.eventId = eventId;
      }
      if (changingPassword) {
        body.password = password;
      }
      await api.patch(`/admin/users/${encodeURIComponent(userId)}`, body);
      showToast({ title: t("form.updateSuccess"), variant: "success" });
      router.push("/admin/users");
    } catch (err) {
      const code = err instanceof ApiError ? err.code : undefined;
      const message =
        code === "EMAIL_EXISTS"
          ? t("form.emailExists")
          : code === "EVENT_REQUIRED"
            ? t("form.eventRequired")
            : code === "INVALID_PASSWORD"
              ? t("form.passwordTooShort")
              : t("form.updateError");
      showToast({ title: message, variant: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <Skeleton className="mx-auto h-96 max-w-3xl w-full rounded-2xl" />;
  }

  if (loadError) {
    return (
      <div className="rounded-2xl border border-error-200 bg-error-50 p-6 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
        {loadError}
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3"
    >
      <h2 className="mb-6 text-lg font-semibold text-gray-800 dark:text-white/90">
        {t("form.editCardTitle")}
      </h2>
      <UserFormFields
        name={name}
        email={email}
        role={role}
        eventId={eventId}
        password={password}
        confirmPassword={confirmPassword}
        events={events}
        passwordOptional
        disabled={isSubmitting}
        onNameChange={setName}
        onEmailChange={setEmail}
        onRoleChange={handleRoleChange}
        onEventChange={setEventId}
        onPasswordChange={setPassword}
        onConfirmPasswordChange={setConfirmPassword}
      />
      <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-5 dark:border-gray-800">
        <Link href="/admin/users">
          <Button type="button" variant="outline">
            {t("form.cancel")}
          </Button>
        </Link>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t("form.saving") : t("form.editSubmit")}
        </Button>
      </div>
    </form>
  );
}
