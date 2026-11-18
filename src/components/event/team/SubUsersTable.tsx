"use client";

import type { EventSubUserItem } from "@/types/event/permissions";
import { showConfirm } from "@/utils/confirm";
import { KeyIcon, TrashIcon, UserPlusIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import React from "react";

interface SubUsersTableProps {
  subUsers: EventSubUserItem[];
  canManage: boolean;
  onEditPermissions: (subUser: EventSubUserItem) => void;
  onInviteClick: () => void;
  onRemove: (subUserId: string) => Promise<void>;
}

export default function SubUsersTable({
  subUsers,
  canManage,
  onEditPermissions,
  onInviteClick,
  onRemove,
}: SubUsersTableProps) {
  const t = useTranslations("team");
  const tCommon = useTranslations("common");

  const handleRemove = async (subUser: EventSubUserItem) => {
    const confirmed = await showConfirm({
      title: t("confirmRemoveTitle"),
      message: t("confirmRemoveMessage", { name: subUser.name }),
      confirmLabel: t("removeButton"),
      cancelLabel: tCommon("cancel"),
      variant: "danger",
    });

    if (confirmed) {
      await onRemove(subUser.id);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/3">
      {/* Table Header / Action Bar */}
      <div className="flex flex-col gap-3 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white/90">
            {t("teamMembersTitle")}
          </h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {t("teamMembersDesc")}
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={onInviteClick}
            className="inline-flex items-center gap-2 rounded-xl bg-[#7F56D9] px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#6941C6]"
          >
            <UserPlusIcon className="size-4" />
            {t("inviteButton")}
          </button>
        )}
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-start text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50 text-theme-xs text-gray-500 uppercase dark:border-gray-800 dark:bg-white/2 dark:text-gray-400">
              <th className="px-5 py-3.5 text-start font-medium">
                {t("colMember")}
              </th>
              <th className="px-5 py-3.5 text-start font-medium">
                {t("colRole")}
              </th>
              <th className="px-5 py-3.5 text-start font-medium">
                {t("colStatus")}
              </th>
              <th className="px-5 py-3.5 text-start font-medium">
                {t("colPermissions")}
              </th>
              <th className="px-5 py-3.5 text-end font-medium">
                {t("colActions")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {subUsers.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="py-10 text-center text-gray-500 dark:text-gray-400"
                >
                  {t("noMembers")}
                </td>
              </tr>
            ) : (
              subUsers.map((user) => {
                return (
                  <tr
                    key={user.id}
                    className="transition hover:bg-gray-50/60 dark:hover:bg-white/2"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-600 dark:bg-brand-950/50 dark:text-brand-400">
                          {user.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white/90">
                            {user.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-gray-700 dark:text-gray-300">
                      <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-300">
                        {user.customRoleName || t("defaultRoleName")}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-theme-xs font-medium ${
                          user.status === "active"
                            ? "bg-success-50 text-success-700 dark:bg-success-950/40 dark:text-success-300"
                            : user.status === "invited"
                              ? "bg-warning-50 text-warning-700 dark:bg-warning-950/40 dark:text-warning-300"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                        }`}
                      >
                        {t(`statuses.${user.status}`)}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex max-w-xs flex-wrap gap-1.5">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
                            user.permissions.event === "can_edit"
                              ? "bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300"
                              : user.permissions.event === "view_only"
                                ? "bg-blue-light-50 text-blue-light-700 dark:bg-blue-light-950/40 dark:text-blue-light-300"
                                : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
                          }`}
                        >
                          Event: {t(`levels.${user.permissions.event}`)}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
                            user.permissions.registrationForm === "can_edit"
                              ? "bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300"
                              : user.permissions.registrationForm ===
                                  "view_only"
                                ? "bg-blue-light-50 text-blue-light-700 dark:bg-blue-light-950/40 dark:text-blue-light-300"
                                : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
                          }`}
                        >
                          Reg:{" "}
                          {t(`levels.${user.permissions.registrationForm}`)}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
                            user.permissions.surveyForm === "can_edit"
                              ? "bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300"
                              : user.permissions.surveyForm === "view_only"
                                ? "bg-blue-light-50 text-blue-light-700 dark:bg-blue-light-950/40 dark:text-blue-light-300"
                                : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
                          }`}
                        >
                          Survey: {t(`levels.${user.permissions.surveyForm}`)}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
                            user.permissions.dashboard === "can_edit"
                              ? "bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300"
                              : user.permissions.dashboard === "view_only"
                                ? "bg-blue-light-50 text-blue-light-700 dark:bg-blue-light-950/40 dark:text-blue-light-300"
                                : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
                          }`}
                        >
                          Dash: {t(`levels.${user.permissions.dashboard}`)}
                        </span>
                        {user.permissions.canViewSubmissions && (
                          <span className="rounded bg-success-50 px-1.5 py-0.5 text-[11px] font-medium text-success-700 dark:bg-success-950/40 dark:text-success-300">
                            Submissions
                          </span>
                        )}
                        {user.permissions.canExport && (
                          <span className="rounded bg-orange-50 px-1.5 py-0.5 text-[11px] font-medium text-orange-700 dark:bg-orange-950/40 dark:text-orange-300">
                            Export
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-end">
                      {canManage && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => onEditPermissions(user)}
                            className="inline-flex size-8 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-brand-600 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-brand-400"
                            title={t("editPermissionsTooltip")}
                          >
                            <KeyIcon className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemove(user)}
                            className="inline-flex size-8 items-center justify-center rounded-lg text-gray-500 transition hover:bg-error-50 hover:text-error-600 dark:text-gray-400 dark:hover:bg-error-950/40 dark:hover:text-error-400"
                            title={t("removeTooltip")}
                          >
                            <TrashIcon className="size-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
