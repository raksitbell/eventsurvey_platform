"use client";

import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import SelectField from "@/components/form/SelectField";
import Button from "@/components/ui/button/Button";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/core/api";
import { fetchImpersonationTarget } from "@/core/auth";
import { slugifyFromTitles } from "@/core/validation/admin-events";
import { Link, useRouter } from "@/i18n/navigation";
import type {
  AssignableAdmin,
  CreateAdminEventResult,
} from "@/types/admin/events";
import { showAlert, showError, showSuccess } from "@/utils/alert";
import { useTranslations } from "next-intl";
import { FormEvent, useEffect, useState } from "react";

type Mode = "existing" | "new";

export default function CreateEventForm() {
  const t = useTranslations("adminEvents.create");
  const tc = useTranslations("confirm");
  const router = useRouter();
  const { impersonate } = useAuth();

  const [mode, setMode] = useState<Mode>("new");
  const [titleTh, setTitleTh] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [existingUserId, setExistingUserId] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [assignable, setAssignable] = useState<AssignableAdmin[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadAssignable() {
      try {
        const data = await api.get<{ users: AssignableAdmin[] }>(
          "/admin/events/assignable-users",
        );
        if (!cancelled) setAssignable(data.users);
      } catch {
        // leave empty — create with new user still works
      }
    }
    void loadAssignable();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!slugTouched) {
      setSlug(slugifyFromTitles(titleEn, titleTh));
    }
  }, [slugTouched, titleEn, titleTh]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if ((!titleTh.trim() && !titleEn.trim()) || !slug.trim()) {
      await showError(t("errorTitle"), t("errors.required"), tc("ok"));
      return;
    }
    if (mode === "existing" && !existingUserId) {
      await showError(t("errorTitle"), t("errors.required"), tc("ok"));
      return;
    }
    if (mode === "new" && (!adminName.trim() || !adminEmail.trim())) {
      await showError(t("errorTitle"), t("errors.required"), tc("ok"));
      return;
    }

    setIsSubmitting(true);
    try {
      const body =
        mode === "existing"
          ? {
              titleTh: titleTh.trim(),
              titleEn: titleEn.trim(),
              slug: slug.trim(),
              mode: "existing" as const,
              existingUserId,
            }
          : {
              titleTh: titleTh.trim(),
              titleEn: titleEn.trim(),
              slug: slug.trim(),
              mode: "new" as const,
              adminName: adminName.trim(),
              adminEmail: adminEmail.trim(),
            };

      const result = await api.post<CreateAdminEventResult>(
        "/admin/events",
        body,
      );

      if (result.impersonateUserId) {
        await showSuccess(t("successTitle"), t("successCreated"), tc("ok"));
        const target = await fetchImpersonationTarget(result.impersonateUserId);
        impersonate(target);
        return;
      }

      if (mode === "new" && !result.inviteSent) {
        // Draft + invited user already saved; warn that email did not send.
        await showAlert({
          title: t("successTitle"),
          message: t("errors.mailFailed"),
          confirmLabel: tc("ok"),
          variant: "warning",
        });
        router.push("/admin/events");
        return;
      }

      if (result.inviteSent) {
        await showSuccess(
          t("successTitle"),
          t("inviteSent", { email: result.event.adminEmail ?? adminEmail }),
          tc("ok"),
        );
        router.push("/admin/events");
        return;
      }

      await showSuccess(t("successTitle"), t("successCreated"), tc("ok"));
      router.push("/admin/events");
    } catch (err) {
      const code = err instanceof Error ? err.message : "generic";
      const message =
        code === "SLUG_EXISTS"
          ? t("errors.slugExists")
          : code === "EMAIL_EXISTS"
            ? t("errors.emailExists")
            : t("errors.generic");
      await showError(t("errorTitle"), message, tc("ok"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3"
    >
      <h2 className="mb-6 text-lg font-semibold text-gray-800 dark:text-white/90">
        {t("cardTitle")}
      </h2>

      <div className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <Label>{t("eventNameTh")}</Label>
            <Input
              value={titleTh}
              onChange={(e) => setTitleTh(e.target.value)}
              placeholder={t("eventNameThPlaceholder")}
            />
          </div>
          <div>
            <Label>{t("eventNameEn")}</Label>
            <Input
              value={titleEn}
              onChange={(e) => setTitleEn(e.target.value)}
              placeholder={t("eventNameEnPlaceholder")}
            />
          </div>
        </div>
        <p className="text-theme-xs text-gray-500 dark:text-gray-400">
          {t("eventNameHint")}
        </p>

        <div>
          <Label>
            {t("slug")} <span className="text-error-500">*</span>
          </Label>
          <Input
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value.toLowerCase());
            }}
            placeholder="csi-eventsurvey-2028"
          />
          <p className="mt-1.5 text-theme-xs text-gray-500 dark:text-gray-400">
            {t("slugHint")}
          </p>
        </div>

        <div>
          <div className="mb-3 flex gap-2 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
            <button
              type="button"
              onClick={() => setMode("existing")}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
                mode === "existing"
                  ? "bg-white text-gray-900 shadow-theme-xs dark:bg-gray-700 dark:text-white"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              {t("modeExisting")}
            </button>
            <button
              type="button"
              onClick={() => setMode("new")}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
                mode === "new"
                  ? "bg-white text-gray-900 shadow-theme-xs dark:bg-gray-700 dark:text-white"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              {t("modeNew")}
            </button>
          </div>

          {mode === "existing" ? (
            <div>
              <Label>
                {t("selectUser")} <span className="text-error-500">*</span>
              </Label>
              <SelectField
                value={existingUserId}
                onChange={(e) => setExistingUserId(e.target.value)}
              >
                <option value="">{t("selectUserPlaceholder")}</option>
                {assignable.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </SelectField>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Label>
                  {t("adminName")} <span className="text-error-500">*</span>
                </Label>
                <Input
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                />
              </div>
              <div>
                <Label>
                  {t("adminEmail")} <span className="text-error-500">*</span>
                </Label>
                <Input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@example.com"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-5 dark:border-gray-800">
          <Link href="/admin/events">
            <Button type="button" variant="outline">
              {t("cancel")}
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? t("submitting")
              : mode === "new"
                ? t("submitNew")
                : t("submit")}
          </Button>
        </div>
      </div>
    </form>
  );
}
