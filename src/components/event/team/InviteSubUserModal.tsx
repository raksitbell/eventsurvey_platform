"use client";

import { Modal } from "@/components/ui/modal";
import { DEFAULT_SUB_USER_MATRIX } from "@/core/auth/event-permissions";
import type {
  EventPermissionMatrix,
  InviteSubUserInput,
  ModuleAccessLevel,
} from "@/types/event/permissions";
import { useTranslations } from "next-intl";
import React, { useState } from "react";

interface InviteSubUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (input: InviteSubUserInput) => Promise<void>;
}

const MODULES = [
  { key: "event", titleKey: "modules.event" },
  { key: "registrationForm", titleKey: "modules.registrationForm" },
  { key: "surveyForm", titleKey: "modules.surveyForm" },
  { key: "dashboard", titleKey: "modules.dashboard" },
] as const;

export default function InviteSubUserModal({
  isOpen,
  onClose,
  onInvite,
}: InviteSubUserModalProps) {
  const t = useTranslations("team");
  const tCommon = useTranslations("common");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [roleName, setRoleName] = useState("");
  const [permissions, setPermissions] = useState<EventPermissionMatrix>(
    DEFAULT_SUB_USER_MATRIX,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setName("");
    setEmail("");
    setRoleName("");
    setPermissions(DEFAULT_SUB_USER_MATRIX);
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError(t("nameEmailRequired"));
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onInvite({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        roleName: roleName.trim() || t("defaultRoleName"),
        permissions,
      });
      handleClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("inviteError");
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-5 p-1">
        {/* Title & Desc */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {t("inviteSubUserTitle")}
          </h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {t("inviteSubUserDesc")}
          </p>
        </div>

        {error && (
          <div className="rounded-xl bg-error-50 p-3 text-xs text-error-700 dark:bg-error-950/40 dark:text-error-300">
            {error}
          </div>
        )}

        {/* Inputs */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
              {t("fullNameLabel")} *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("fullNamePlaceholder")}
              className="mt-1.5 block w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-[#7F56D9] focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
              {t("emailLabel")} *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="mt-1.5 block w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-[#7F56D9] focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
        </div>

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

        {/* 4 Core Modules Permissions Matrix */}
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
                setPermissions((p) => ({
                  ...p,
                  canViewSubmissions: e.target.checked,
                }))
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
                setPermissions((p) => ({ ...p, canExport: e.target.checked }))
              }
              className="size-4 rounded border-gray-300 text-[#7F56D9] focus:ring-[#7F56D9]"
            />
            <span className="text-xs font-medium text-gray-800 dark:text-white/90">
              {t("toggles.exportData")}
            </span>
          </label>
        </div>

        {/* Modal Buttons Footer (สีม่วง #7F56D9 ตาม Figma) */}
        <div className="flex justify-end gap-3 pt-3">
          <button
            type="button"
            onClick={handleClose}
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
            {isSubmitting ? t("inviting") : t("inviteButton")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
