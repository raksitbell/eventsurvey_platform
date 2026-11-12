"use client";

import { Modal } from "@/components/ui/modal";
import type {
  EventPermissionMatrix,
  EventSubUserItem,
  ModuleAccessLevel,
} from "@/types/event/permissions";
import {
  ChartBarSquareIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  GlobeAltIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import React, { useEffect, useState } from "react";

interface PermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  subUser: EventSubUserItem | null;
  eventName?: string;
  onSave: (
    subUserId: string,
    roleName: string,
    permissions: EventPermissionMatrix,
  ) => Promise<void>;
}

const MODULES = [
  {
    key: "event",
    titleKey: "modules.event",
    descKey: "modules.eventDesc",
    Icon: GlobeAltIcon,
  },
  {
    key: "registrationForm",
    titleKey: "modules.registrationForm",
    descKey: "modules.registrationFormDesc",
    Icon: ClipboardDocumentListIcon,
  },
  {
    key: "surveyForm",
    titleKey: "modules.surveyForm",
    descKey: "modules.surveyFormDesc",
    Icon: DocumentTextIcon,
  },
  {
    key: "dashboard",
    titleKey: "modules.dashboard",
    descKey: "modules.dashboardDesc",
    Icon: ChartBarSquareIcon,
  },
] as const;

export default function PermissionModal({
  isOpen,
  onClose,
  subUser,
  eventName,
  onSave,
}: PermissionModalProps) {
  const t = useTranslations("team");
  const tCommon = useTranslations("common");

  const [permissions, setPermissions] = useState<EventPermissionMatrix>({
    event: "view_only",
    registrationForm: "view_only",
    surveyForm: "view_only",
    dashboard: "view_only",
    canViewSubmissions: false,
    canManageSubmissions: false,
    canExport: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (subUser) {
      setPermissions({
        event: subUser.permissions.event ?? "view_only",
        registrationForm: subUser.permissions.registrationForm ?? "view_only",
        surveyForm: subUser.permissions.surveyForm ?? "view_only",
        dashboard: subUser.permissions.dashboard ?? "view_only",
        canViewSubmissions: Boolean(subUser.permissions.canViewSubmissions),
        canManageSubmissions: Boolean(subUser.permissions.canManageSubmissions),
        canExport: Boolean(subUser.permissions.canExport),
      });
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
    key: "canViewSubmissions" | "canManageSubmissions" | "canExport",
    value: boolean,
  ) => {
    setPermissions((prev) => {
      if (key === "canManageSubmissions") {
        return {
          ...prev,
          canManageSubmissions: value,
          // Manage Submission -> automatically enables View Submission
          canViewSubmissions: value ? true : prev.canViewSubmissions,
        };
      }
      if (key === "canViewSubmissions") {
        return {
          ...prev,
          canViewSubmissions: value,
          // Disabling View Submission -> also disables Manage Submission
          canManageSubmissions: !value ? false : prev.canManageSubmissions,
        };
      }
      return {
        ...prev,
        [key]: value,
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subUser) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await onSave(
        subUser.id,
        subUser.customRoleName || t("defaultRoleName"),
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      showCloseButton={false}
      className="max-w-2xl p-6 sm:p-7"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 sm:text-2xl dark:text-white">
              {t("editPermissionsTitle")}
            </h2>
            <p className="mt-1 text-xs text-gray-500 sm:text-sm dark:text-gray-400">
              {eventName ? `${eventName} · ` : ""}
              {subUser.name}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex shrink-0 items-center rounded-lg bg-[#F6F0FA] px-3 py-1.5 text-xs font-semibold text-[#7A57A4] dark:bg-purple-950/40 dark:text-purple-300">
              {t("eventAdminOnly")}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#F3F2F5] text-gray-500 transition hover:bg-gray-200 hover:text-gray-800 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
              aria-label="Close"
            >
              <XMarkIcon className="size-4 stroke-2" />
            </button>
          </div>
        </div>

        {/* Notice Banner */}
        <div className="rounded-xl bg-[#F7F2FA] px-4 py-2.5 text-xs font-medium text-[#7A57A4] dark:bg-purple-950/30 dark:text-purple-300">
          {t("eventScopedNotice")}
        </div>

        {error && (
          <div className="rounded-xl bg-error-50 p-3 text-xs text-error-700 dark:bg-error-950/40 dark:text-error-300">
            {error}
          </div>
        )}

        {/* 4 Core Modules Rows */}
        <div className="space-y-3.5 pt-1">
          {MODULES.map(({ key, titleKey, descKey, Icon }) => {
            const currentLevel = permissions[key];
            return (
              <div
                key={key}
                className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              >
                {/* Left: Icon & Description */}
                <div className="flex items-center gap-3.5">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#F4F1F8] text-[#7A57A4] dark:bg-gray-800 dark:text-purple-300">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      {t(titleKey)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t(descKey)}
                    </p>
                  </div>
                </div>

                {/* Right: Segmented Control */}
                <div className="inline-flex items-center rounded-xl bg-[#F4F2F7] p-1 dark:bg-gray-800">
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
                        className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                          isSelected
                            ? "bg-[#724C9F] text-white shadow-xs dark:bg-[#724C9F]"
                            : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
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

        {/* Section: Submissions & Export Permissions */}
        <div className="space-y-3 pt-3">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              {t("submissionsSectionTitle")}
            </h3>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {t("submissionsSectionDesc")}
            </p>
          </div>

          {/* 3 Toggle Cards */}
          <div className="space-y-2.5">
            {/* 1. View Submission */}
            <div className="flex items-center justify-between rounded-xl bg-[#F9F8FA] px-4 py-3 dark:bg-gray-800/60">
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  {t("toggles.viewSubmissions")}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t("toggles.viewSubmissionsDesc")}
                </p>
              </div>
              <CustomSwitch
                id="toggle-view-submission"
                checked={permissions.canViewSubmissions}
                onChange={(checked) =>
                  handleToggleChange("canViewSubmissions", checked)
                }
              />
            </div>

            {/* 2. Manage Submission */}
            <div className="flex items-center justify-between rounded-xl bg-[#F9F8FA] px-4 py-3 dark:bg-gray-800/60">
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  {t("toggles.manageSubmissions")}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t("toggles.manageSubmissionsDesc")}
                </p>
              </div>
              <CustomSwitch
                id="toggle-manage-submission"
                checked={Boolean(permissions.canManageSubmissions)}
                onChange={(checked) =>
                  handleToggleChange("canManageSubmissions", checked)
                }
              />
            </div>

            {/* 3. Export */}
            <div className="flex items-center justify-between rounded-xl bg-[#F9F8FA] px-4 py-3 dark:bg-gray-800/60">
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  {t("toggles.exportData")}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t("toggles.exportDataDesc")}
                </p>
              </div>
              <CustomSwitch
                id="toggle-export"
                checked={permissions.canExport}
                onChange={(checked) => handleToggleChange("canExport", checked)}
              />
            </div>
          </div>

          {/* Dependency Helper Rules */}
          <div className="space-y-0.5 pt-1 text-xs">
            <p className="font-semibold text-[#724C9F] dark:text-purple-300">
              {t("rules.rule1")}
            </p>
            <p className="text-gray-500 dark:text-gray-400">
              {t("rules.rule2")}
            </p>
          </div>
        </div>

        {/* Modal Action Buttons Footer */}
        <div className="flex items-center justify-end gap-3 pt-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl bg-[#F3F2F5] px-6 py-2.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {tCommon("cancel")}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-[#724C9F] px-6 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#623F8F] disabled:bg-gray-300 dark:hover:bg-[#835BB3]"
          >
            {isSubmitting ? t("saving") : t("savePermissions")}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/**
 * Toggle Switch matching the exact Figma design in the screenshot:
 * Pill track with smooth sliding white knob circle.
 */
function CustomSwitch({
  id,
  checked,
  onChange,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#724C9F]/50 ${
        checked ? "bg-[#5B6DEE]" : "bg-gray-300 dark:bg-gray-600"
      }`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block size-5 rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-5 rtl:-translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}
