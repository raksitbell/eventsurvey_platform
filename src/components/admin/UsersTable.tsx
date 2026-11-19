"use client";

import Button from "@/components/ui/button/Button";
import { TableBodySkeleton } from "@/components/ui/skeleton/Skeleton";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/core/api";
import { canAccessAdmin } from "@/core/auth";
import type {
  AdminUserListItem,
  AdminUsersResponse,
} from "@/types/admin/users";
import type { UserRole } from "@/types/user";
import { translateRole, translateStatus } from "@/utils/i18n-labels";
import { useConfirm } from "@/hooks/useConfirm";
import { EyeIcon } from "@heroicons/react/24/outline";
import { showToast } from "@/utils/alert";
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
  const te = useTranslations("adminEvents");
  const tc = useTranslations("confirm");
  const ti = useTranslations("eventInspection");
  const locale = useLocale() as Locale;
  const tCommon = useTranslations("common");
  const { confirm } = useConfirm();
  const { realUser, inspectEvent } = useAuth();
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

    void loadUsers();
    return () => {
      cancelled = true;
    };
  }, [locale, roleFilter, t]);

  const filteredUsers = useMemo(() => users, [users]);

  const openWorkspace = async (target: AdminUserListItem) => {
    if (!target.eventId || !realUser || !canAccessAdmin(realUser.role)) return;
    const confirmed = await confirm({
      title: tc("inspectTitle"),
      message: ti("confirmStart", {
        event: target.eventName?.trim() || ti("unnamedEvent"),
      }),
      confirmLabel: te("openWorkspace"),
      cancelLabel: tc("cancel"),
      variant: "warning",
    });
    if (!confirmed) return;

    setPendingId(target.id);
    try {
      await inspectEvent(target.eventId);
    } catch {
      showToast({ title: te("openWorkspaceError"), variant: "error" });
      setPendingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {ROLE_FILTERS.map((role) => (
          <Button
            key={role}
            size="sm"
            variant={roleFilter === role ? "primary" : "outline"}
            onClick={() => setRoleFilter(role)}
          >
            {role === "all" ? t("allRoles") : translateRole(tCommon, role)}
          </Button>
        ))}
      </div>

      {error ? (
        <p className="text-sm text-error-600 dark:text-error-400">{error}</p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <table className="min-w-full">
            <thead className="border-b border-gray-100 dark:border-gray-800">
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
                <TableBodySkeleton columns={8} rows={6} />
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
                  const canOpen =
                    Boolean(realUser) &&
                    canAccessAdmin(realUser!.role) &&
                    Boolean(user.eventId) &&
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
                        {canOpen ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={pendingId === user.id}
                            onClick={() => void openWorkspace(user)}
                            startIcon={<EyeIcon className="size-5" />}
                          >
                            {te("openWorkspace")}
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
