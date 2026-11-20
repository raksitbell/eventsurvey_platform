"use client";

import Button from "@/components/ui/button/Button";
import RowActionsMenu from "@/components/ui/dropdown/RowActionsMenu";
import { TableBodySkeleton } from "@/components/ui/skeleton/Skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/context/AuthContext";
import { api, ApiError } from "@/core/api";
import { useConfirm } from "@/hooks/useConfirm";
import { Link } from "@/i18n/navigation";
import type {
  AdminUserListItem,
  AdminUsersResponse,
} from "@/types/admin/users";
import { showProgress, showToast } from "@/utils/alert";
import {
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

export default function TrialAccountsTable() {
  const t = useTranslations("platformConfiguration");
  const users = useTranslations("adminUsers");
  const common = useTranslations("common");
  const locale = useLocale();
  const { canManageUsers, realUser } = useAuth();
  const { confirm } = useConfirm();
  const [rows, setRows] = useState<AdminUserListItem[] | "loading" | "error">(
    "loading",
  );
  const [attempt, setAttempt] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const request = new AbortController();
    async function loadAccounts() {
      setRows("loading");
      try {
        const params = new URLSearchParams({ trial: "true", locale });
        const data = await api.get<AdminUsersResponse>(
          `/admin/users?${params}`,
          request.signal,
        );
        if (!request.signal.aborted) setRows(data.users);
      } catch {
        if (!request.signal.aborted) setRows("error");
      }
    }
    void loadAccounts();
    return () => request.abort();
  }, [attempt, locale]);

  async function deleteAccount(user: AdminUserListItem) {
    const confirmed = await confirm({
      title: t("deleteTrialAccount"),
      message: users("form.deleteConfirm", {
        name: user.name ? `${user.name} (${user.email})` : user.email,
      }),
      confirmLabel: users("form.deleteSubmit"),
      variant: "danger",
    });
    if (!confirmed) return;

    setDeleting(true);
    showProgress(t("deletingTrialAccount"), user.email);
    try {
      await api.delete(
        `/admin/users/${encodeURIComponent(user.id)}?trial=true`,
      );
      setRows((current) =>
        Array.isArray(current)
          ? current.filter((row) => row.id !== user.id)
          : current,
      );
      showToast({ title: users("form.deleteSuccess"), variant: "success" });
    } catch (error) {
      let message = users("form.deleteError");
      if (error instanceof ApiError && error.code === "USER_NOT_FOUND") {
        message = t("trialAccountUnavailable");
        setAttempt((count) => count + 1);
      } else if (
        error instanceof ApiError &&
        error.code === "CANNOT_DELETE_SELF"
      ) {
        message = users("form.cannotDeleteSelf");
      }
      showToast({ title: message, variant: "error" });
    } finally {
      setDeleting(false);
    }
  }

  const columns = canManageUsers
    ? (["user", "role", "actions"] as const)
    : (["user", "role"] as const);
  return (
    <div className="space-y-4">
      {canManageUsers && (
        <div className="flex justify-end">
          <Link
            href="/admin/users/new?from=trial-accounts"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 focus-visible:outline-brand-500"
          >
            <PlusIcon aria-hidden="true" className="size-4" />
            {t("addTrialAccount")}
          </Link>
        </div>
      )}
      <div
        aria-busy={rows === "loading" || deleting}
        className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
      >
        <Table className="text-start text-sm text-gray-700 dark:text-gray-300">
          <caption className="sr-only">{t("trialAccounts")}</caption>
          <TableHeader className="bg-gray-50 dark:bg-white/5">
            <TableRow>
              {columns.map((column) => (
                <th
                  key={column}
                  scope="col"
                  className={`px-4 py-3 text-theme-xs font-medium text-gray-500 dark:text-gray-400 ${column === "actions" ? "text-end" : "text-start"}`}
                >
                  {users(`columns.${column}`)}
                </th>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-200 dark:divide-gray-800">
            {rows === "loading" ? (
              <TableBodySkeleton columns={columns.length} rows={3} />
            ) : rows === "error" ? (
              <TableRow>
                <td
                  colSpan={columns.length}
                  className="space-y-3 px-4 py-6 text-center"
                >
                  <p
                    role="alert"
                    className="text-error-600 dark:text-error-400"
                  >
                    {users("loadError")}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAttempt((count) => count + 1)}
                  >
                    {t("retry")}
                  </Button>
                </td>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <td colSpan={columns.length} className="px-4 py-8 text-center">
                  {t("emptyTrialAccounts")}
                </td>
              </TableRow>
            ) : (
              rows.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="px-4 py-3">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {user.name}
                    </div>
                    <div className="text-theme-xs break-all text-gray-500 dark:text-gray-400">
                      {user.email}
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    {user.role === "participant"
                      ? common("roles.participant")
                      : users(`filters.${user.role}`)}
                  </TableCell>
                  {canManageUsers && (
                    <TableCell className="px-4 py-3 text-end">
                      <RowActionsMenu
                        label={t("accountActions", {
                          name: user.name || user.email,
                        })}
                        busy={deleting}
                        actions={[
                          {
                            label: users("actions.edit"),
                            icon: PencilSquareIcon,
                            href: `/admin/users/${encodeURIComponent(user.id)}/edit?from=trial-accounts`,
                          },
                          {
                            label: users("actions.delete"),
                            icon: TrashIcon,
                            danger: true,
                            reason:
                              user.id === realUser?.id
                                ? users("form.cannotDeleteSelf")
                                : undefined,
                            run: () => void deleteAccount(user),
                          },
                        ]}
                      />
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
