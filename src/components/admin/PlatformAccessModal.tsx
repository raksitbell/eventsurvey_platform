"use client";

import { Modal } from "@/components/ui/modal";
import { api } from "@/core/api";
import {
  DEFAULT_PLATFORM_MATRIX,
  type AdminUserListItem,
  type PlatformAccessMatrix,
} from "@/types/admin/users";
import type { ModuleAccessLevel } from "@/types/event/permissions";
import {
  CalendarDaysIcon,
  Squares2X2Icon,
  UserGroupIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import React, { useEffect, useState } from "react";

type Props = {
  user: AdminUserListItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (userId: string, matrix: PlatformAccessMatrix) => void;
};

const MODULES = [
  {
    key: "overview",
    titleKey: "platformModules.overview",
    descKey: "platformModules.overviewDesc",
    Icon: Squares2X2Icon,
  },
  {
    key: "events",
    titleKey: "platformModules.events",
    descKey: "platformModules.eventsDesc",
    Icon: CalendarDaysIcon,
  },
  {
    key: "users",
    titleKey: "platformModules.users",
    descKey: "platformModules.usersDesc",
    Icon: UserGroupIcon,
  },
] as const;

const LEVELS_BY_MODULE: Record<
  (typeof MODULES)[number]["key"],
  ModuleAccessLevel[]
> = {
  // Overview has no editable surface — only off / view.
  overview: ["restricted", "view_only"],
  events: ["restricted", "view_only", "can_edit"],
  users: ["restricted", "view_only", "can_edit"],
};

export default function PlatformAccessModal({
  user,
  isOpen,
  onClose,
  onSaved,
}: Props) {
  const t = useTranslations("adminUsers");
  const tCommon = useTranslations("common");
  const [permissions, setPermissions] = useState<PlatformAccessMatrix>({
    ...DEFAULT_PLATFORM_MATRIX,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !user) return;
    setPermissions({
      ...(user.platformAccess ?? DEFAULT_PLATFORM_MATRIX),
    });
    setError(null);
  }, [isOpen, user]);

  const handleModuleChange = (
    moduleKey: keyof Pick<PlatformAccessMatrix, "overview" | "events" | "users">,
    level: ModuleAccessLevel,
  ) => {
    setPermissions((prev) => ({
      ...prev,
      [moduleKey]: level,
    }));
  };

  const handleToggleChange = (
    key: "canViewActivity" | "canInspection" | "canViewUnmaskedPii",
    value: boolean,
  ) => {
    setPermissions((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const matrix = await api.patch<PlatformAccessMatrix>(
        `/admin/users/${encodeURIComponent(user.id)}/platform-access`,
        permissions,
      );
      onSaved(user.id, matrix);
      onClose();
    } catch {
      setError(t("platformAccessSaveError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      showCloseButton={false}
      className="max-w-2xl p-6 sm:p-7"
      labelledBy="platform-access-title"
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="platform-access-title"
              className="text-xl font-bold text-gray-900 sm:text-2xl dark:text-white"
            >
              {t("platformAccessTitle")}
            </h2>
            <p className="mt-1 text-xs text-gray-500 sm:text-sm dark:text-gray-400">
              {user.name}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex shrink-0 items-center rounded-lg bg-[#F6F0FA] px-3 py-1.5 text-xs font-semibold text-[#7A57A4] dark:bg-purple-950/40 dark:text-purple-300">
              {t("platformAdminOnly")}
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

        <div className="rounded-xl bg-[#F7F2FA] px-4 py-2.5 text-xs font-medium text-[#7A57A4] dark:bg-purple-950/30 dark:text-purple-300">
          {t("platformScopedNotice")}
        </div>

        {error ? (
          <div className="rounded-xl bg-error-50 p-3 text-xs text-error-700 dark:bg-error-950/40 dark:text-error-300">
            {error}
          </div>
        ) : null}

        <div className="space-y-3.5 pt-1">
          {MODULES.map(({ key, titleKey, descKey, Icon }) => {
            const currentLevel = permissions[key];
            return (
              <div
                key={key}
                className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              >
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

                <div className="inline-flex items-center rounded-xl bg-[#F4F2F7] p-1 dark:bg-gray-800">
                  {LEVELS_BY_MODULE[key].map((level) => {
                    const selectedLevel =
                      key === "overview" && currentLevel === "can_edit"
                        ? "view_only"
                        : currentLevel;
                    const isSelected = selectedLevel === level;
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

        <div className="space-y-3 pt-3">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              {t("platformTogglesSectionTitle")}
            </h3>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {t("platformTogglesSectionDesc")}
            </p>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between rounded-xl bg-[#F9F8FA] px-4 py-3 dark:bg-gray-800/60">
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  {t("platformFlags.canViewActivity")}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t("platformFlags.canViewActivityDesc")}
                </p>
              </div>
              <CustomSwitch
                id="platform-toggle-view-activity"
                checked={permissions.canViewActivity}
                onChange={(checked) =>
                  handleToggleChange("canViewActivity", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between rounded-xl bg-[#F9F8FA] px-4 py-3 dark:bg-gray-800/60">
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  {t("platformFlags.canInspection")}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t("platformFlags.canInspectionDesc")}
                </p>
              </div>
              <CustomSwitch
                id="platform-toggle-inspection"
                checked={permissions.canInspection}
                onChange={(checked) =>
                  handleToggleChange("canInspection", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between rounded-xl bg-[#F9F8FA] px-4 py-3 dark:bg-gray-800/60">
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  {t("platformFlags.canViewUnmaskedPii")}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t("platformFlags.canViewUnmaskedPiiDesc")}
                </p>
              </div>
              <CustomSwitch
                id="platform-toggle-unmasked-pii"
                checked={permissions.canViewUnmaskedPii}
                onChange={(checked) =>
                  handleToggleChange("canViewUnmaskedPii", checked)
                }
              />
            </div>
          </div>
        </div>

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
            {isSubmitting ? t("platformAccessSaving") : tCommon("save")}
          </button>
        </div>
      </form>
    </Modal>
  );
}

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
