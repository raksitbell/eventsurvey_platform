"use client";

import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import SelectField from "@/components/form/SelectField";
import type { UserRole } from "@/types/user";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { useState } from "react";

const ROLE_OPTIONS: UserRole[] = ["super_admin", "event_owner", "sub_user"];

export function needsAssignedEvent(role: UserRole): boolean {
  return role === "sub_user";
}

type Props = {
  name: string;
  email: string;
  role: UserRole;
  eventId: string;
  password: string;
  confirmPassword: string;
  events: Array<{ id: string; title: string }>;
  /** When true, password is optional (edit). When false, password is required (create). */
  passwordOptional?: boolean;
  disabled?: boolean;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onRoleChange: (value: UserRole) => void;
  onEventChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
};

export default function UserFormFields({
  name,
  email,
  role,
  eventId,
  password,
  confirmPassword,
  events,
  passwordOptional = false,
  disabled = false,
  onNameChange,
  onEmailChange,
  onRoleChange,
  onEventChange,
  onPasswordChange,
  onConfirmPasswordChange,
}: Props) {
  const t = useTranslations("adminUsers");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div className="space-y-5">
      <div>
        <Label htmlFor="admin-user-name">
          {t("form.name")} <span className="text-error-500">*</span>
        </Label>
        <Input
          id="admin-user-name"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder={t("form.namePlaceholder")}
          disabled={disabled}
        />
      </div>
      <div>
        <Label htmlFor="admin-user-email">
          {t("form.email")} <span className="text-error-500">*</span>
        </Label>
        <Input
          id="admin-user-email"
          type="email"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder={t("form.emailPlaceholder")}
          disabled={disabled}
          autoComplete="off"
        />
      </div>
      <div>
        <Label htmlFor="admin-user-role">
          {t("form.role")} <span className="text-error-500">*</span>
        </Label>
        <SelectField
          id="admin-user-role"
          value={role}
          onChange={(e) => onRoleChange(e.target.value as UserRole)}
          disabled={disabled}
        >
          {ROLE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {t(`filters.${option}`)}
            </option>
          ))}
        </SelectField>
      </div>
      {needsAssignedEvent(role) ? (
        <div>
          <Label htmlFor="admin-user-event">
            {t("form.event")} <span className="text-error-500">*</span>
          </Label>
          <SelectField
            id="admin-user-event"
            value={eventId}
            onChange={(e) => onEventChange(e.target.value)}
            disabled={disabled}
          >
            <option value="">{t("form.eventPlaceholder")}</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title || event.id}
              </option>
            ))}
          </SelectField>
        </div>
      ) : null}

      <div>
        <Label htmlFor="admin-user-password">
          {t("form.password")}{" "}
          {passwordOptional ? null : <span className="text-error-500">*</span>}
        </Label>
        <div className="relative">
          <Input
            id="admin-user-password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            placeholder={
              passwordOptional
                ? t("form.passwordOptionalPlaceholder")
                : t("form.passwordPlaceholder")
            }
            disabled={disabled}
            autoComplete="new-password"
            className="pe-12"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute inset-y-0 end-0 flex items-center pe-3.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeSlashIcon className="size-5" />
            ) : (
              <EyeIcon className="size-5" />
            )}
          </button>
        </div>
        <p className="mt-1.5 text-theme-xs text-gray-500 dark:text-gray-400">
          {passwordOptional ? t("form.passwordOptionalHint") : t("form.passwordHint")}
        </p>
      </div>

      <div>
        <Label htmlFor="admin-user-confirm-password">
          {t("form.confirmPassword")}{" "}
          {passwordOptional ? null : <span className="text-error-500">*</span>}
        </Label>
        <div className="relative">
          <Input
            id="admin-user-confirm-password"
            type={showConfirm ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => onConfirmPasswordChange(e.target.value)}
            placeholder={t("form.confirmPasswordPlaceholder")}
            disabled={disabled}
            autoComplete="new-password"
            className="pe-12"
          />
          <button
            type="button"
            onClick={() => setShowConfirm((prev) => !prev)}
            className="absolute inset-y-0 end-0 flex items-center pe-3.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            aria-label={showConfirm ? "Hide password" : "Show password"}
          >
            {showConfirm ? (
              <EyeSlashIcon className="size-5" />
            ) : (
              <EyeIcon className="size-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
