"use client";

import { Modal } from "@/components/ui/modal";
import type {
  EventPermissionMatrix,
  EventSubUserItem,
  ModuleAccessLevel,
} from "@/types/event/permissions";
import { useTranslations } from "next-intl";
import React, { useEffect, useState } from "react";

interface PermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  subUser: EventSubUserItem | null;
  onSave: (
    subUserId: string,
    roleName: string,
    permissions: EventPermissionMatrix,
  ) => Promise<void>;
}

const MODULES = [
  { key: "event", titleKey: "modules.event" },
  { key: "registrationForm", titleKey: "modules.registrationForm" },
  { key: "surveyForm", titleKey: "modules.surveyForm" },
  { key: "dashboard", titleKey: "modules.dashboard" },
] as const;

export default function PermissionModal({
  isOpen,
  onClose,
  subUser,
  onSave,
}: PermissionModalProps) {
  const t = useTranslations("team");
  const tCommon = useTranslations("common");

  const [roleName, setRoleName] = useState("");
  const [permissions, setPermissions] = useState<EventPermissionMatrix>({
    event: "view_only",
    registrationForm: "view_only",
    surveyForm: "view_only",
    dashboard: "view_only",
    canViewSubmissions: false,
    canExport: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (subUser) {
      setRoleName(subUser.customRoleName || "");
      setPermissions(subUser.permissions);
      setError(null);
    }
  }, [subUser]);

  const handleModuleChange = (
    moduleKey: keyof Pick<
      EventPermissionMatrix,
      "event" | "registrationForm" | "surveyForm" | "dashboard"
    >,
    level: ModuleAccessLevel,
  ) => {
    setPermissions((prev) => ({
      ...prev,
      [moduleKey]: level,
    }));
  };

  const handleToggleChange = (
    toggleKey: keyof Pick<
      EventPermissionMatrix,
      "canViewSubmissions" | "canExport"
    >,
    value: boolean,
  ) => {
    setPermissions((prev) => ({
      ...prev,
      [toggleKey]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subUser) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await onSave(
        subUser.id,
        roleName.trim() || t("defaultRoleName"),
        permissions,
      );
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("updateError");
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!subUser) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-5 p-1">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {t("editPermissionsTitle")}
          </h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {t("editPermissionsDesc", {
              name: subUser.name,
              email: subUser.email,
            })}
          </p>
        </div>

        {error && (
          <div className="rounded-xl bg-error-50 p-3 text-xs text-error-700 dark:bg-error-950/40 dark:text-error-300">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
            {t("roleNameLabel")}
          </label>
          <input
            type="text"
            value={roleName}
            onChange={(e) => setRoleName(e.target.value)}
            placeholder={t("roleNamePlaceholder")}
            className="mt-1.5 block w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-[#7F56D9] focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>

        {/* 4 Core Modules */}
        <div className="space-y-2.5 pt-1">
          <h3 className="text-xs font-bold tracking-wider text-gray-400 uppercase dark:text-gray-500">
            {t("modulePermissionsHeader")}
          </h3>
          <div className="divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-[#F9FAFB] p-3.5 dark:divide-gray-800 dark:border-gray-800 dark:bg-white/2">
            {MODULES.map(({ key, titleKey }) => {
              const currentLevel = permissions[key];
              return (
                <div
                  key={key}
                  className="flex flex-col gap-2.5 py-2.5 first:pt-1 last:pb-1 sm:flex-row sm:items-center sm:justify-between"
                >
                  <p className="text-xs font-semibold text-gray-800 dark:text-white/90">
                    {t(titleKey)}
                  </p>
                  <div className="flex items-center gap-1.5">
                    {(
                      [
                        "restricted",
                        "view_only",
                        "can_edit",
                      ] as ModuleAccessLevel[]
                    ).map((level) => {
                      const isSelected = currentLevel === level;
                      return (
                        <button
                          key={level}
                          type="button"
                          onClick={() => handleModuleChange(key, level)}
                          className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                            isSelected
                              ? level === "can_edit"
                                ? "bg-[#7F56D9] text-white shadow-sm ring-1 ring-[#7F56D9]"
                                : level === "view_only"
                                  ? "bg-[#0086C9] text-white shadow-sm"
                                  : "bg-gray-600 text-white"
                              : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                          }`}
                        >
                          {t(`levels.${level}`)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2 Special Action Toggles */}
        <div className="grid gap-3 pt-1 sm:grid-cols-2">
          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3.5 transition hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-800/60">
            <input
              type="checkbox"
              checked={permissions.canViewSubmissions}
              onChange={(e) =>
                handleToggleChange("canViewSubmissions", e.target.checked)
              }
              className="size-4 rounded border-gray-300 text-[#7F56D9] focus:ring-[#7F56D9]"
            />
            <span className="text-xs font-medium text-gray-800 dark:text-white/90">
              {t("toggles.viewSubmissions")}
            </span>
          </label>

          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3.5 transition hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-800/60">
            <input
              type="checkbox"
              checked={permissions.canExport}
              onChange={(e) =>
                handleToggleChange("canExport", e.target.checked)
              }
              className="size-4 rounded border-gray-300 text-[#7F56D9] focus:ring-[#7F56D9]"
            />
            <span className="text-xs font-medium text-gray-800 dark:text-white/90">
              {t("toggles.exportData")}
            </span>
          </label>
        </div>

        {/* Action Buttons Footer */}
        <div className="flex justify-end gap-3 pt-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            {tCommon("cancel")}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-[#7F56D9] px-6 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#6941C6] disabled:bg-gray-300"
          >
            {isSubmitting ? t("saving") : tCommon("save")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
