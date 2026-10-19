"use client";

import Button from "@/components/ui/button/Button";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/core/api";
import {
  canImpersonate,
  fetchImpersonationTarget,
  isImpersonatableRole,
} from "@/core/auth";
import { useConfirm } from "@/hooks/useConfirm";
import { GroupIcon } from "@/icons";
import type {
  AdminUserListItem,
  AdminUsersResponse,
} from "@/types/admin/users";
import type { UserRole } from "@/types/user";
import { translateRole, translateStatus } from "@/utils/i18n-labels";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { useEffect, useMemo, useState } from "react";

const ROLE_FILTERS: Array<UserRole | "all"> = [
  "all",
  "super_admin",
  "event_owner",
  "sub_user",
];

export default function UsersTable() {
  const t = useTranslations("adminUsers");
  const locale = useLocale() as Locale;
  const tc = useTranslations("confirm");
  const tCommon = useTranslations("common");
  const { realUser, impersonate } = useAuth();
  const { confirm } = useConfirm();
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadUsers() {
      setIsLoading(true);
      setError(null);
      try {
        const query = `?locale=${encodeURIComponent(locale)}${
          roleFilter === "all" ? "" : `&role=${encodeURIComponent(roleFilter)}`
        }`;
        const data = await api.get<AdminUsersResponse>(`/admin/users${query}`);
        if (!cancelled) {
          setUsers(data.users);
        }
      } catch {
        if (!cancelled) setError(t("loadError"));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadUsers();
    return () => {
      cancelled = true;
    };
  }, [locale, roleFilter, t]);

  const filteredUsers = useMemo(() => users, [users]);

  const handleImpersonate = async (target: AdminUserListItem) => {
    if (!realUser || !canImpersonate(realUser.role)) return;
    if (!isImpersonatableRole(target.role)) return;

    const confirmed = await confirm({
      title: tc("impersonateTitle"),
      message: t("confirmImpersonate", {
        name: target.name,
        role: translateRole(tCommon, target.role),
      }),
      confirmLabel: t("impersonate"),
      variant: "warning",
    });
    if (!confirmed) return;

    setPendingId(target.id);
    try {
      const fullUser = await fetchImpersonationTarget(target.id);
      impersonate(fullUser);
    } catch {
      setError(t("impersonateError"));
      setPendingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {ROLE_FILTERS.map((role) => (
          <button
            key={role}
            type="button"
            onClick={() => setRoleFilter(role)}
            className={`rounded-lg px-3 py-2 text-theme-sm font-medium transition ${
              roleFilter === role
                ? "bg-brand-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
            }`}
          >
            {t(`filters.${role}`)}
          </button>
        ))}
      </div>

      {error ? (
        <p className="rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
          {error}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-white/5">
              <tr>
                <th className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  {t("columns.name")}
                </th>
                <th className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  {t("columns.email")}
                </th>
                <th className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  {t("columns.role")}
                </th>
                <th className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  {t("columns.owner")}
                </th>
                <th className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  {t("columns.events")}
                </th>
                <th className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  {t("columns.customRoles")}
                </th>
                <th className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  {t("columns.status")}
                </th>
                <th className="px-4 py-3 text-end text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  {t("columns.actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    {t("loading")}
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    {t("empty")}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const canAct =
                    Boolean(realUser) &&
                    canImpersonate(realUser!.role) &&
                    isImpersonatableRole(user.role) &&
                    user.status === "active";

                  return (
                    <tr key={user.id}>
                      <td className="px-4 py-3 text-sm text-gray-800 dark:text-white/90">
                        {user.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {user.email}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {translateRole(tCommon, user.role)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {user.ownerName ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {user.eventName ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {user.customRoleName ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {translateStatus(tCommon, user.status)}
                      </td>
                      <td className="px-4 py-3 text-end">
                        {canAct ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={pendingId === user.id}
                            onClick={() => handleImpersonate(user)}
                            startIcon={
                              <GroupIcon className="size-5 text-brand-500" />
                            }
                          >
                            {pendingId === user.id
                              ? t("impersonating")
                              : t("impersonate")}
                          </Button>
                        ) : (
                          <span className="text-theme-sm text-gray-400">—</span>
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
    </div>
  );
}
