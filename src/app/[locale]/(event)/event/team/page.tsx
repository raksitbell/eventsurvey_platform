"use client";

import InviteSubUserModal from "@/components/event/team/InviteSubUserModal";
import PermissionModal from "@/components/event/team/PermissionModal";
import SubUsersTable from "@/components/event/team/SubUsersTable";
import Skeleton from "@/components/ui/skeleton/Skeleton";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/core/api";
import useEventWorkspace from "@/hooks/useEventWorkspace";
import { useModal } from "@/hooks/useModal";
import type {
  EventPermissionMatrix,
  EventSubUserItem,
  InviteSubUserInput,
  InviteSubUserResult,
  SubUsersListResponse,
} from "@/types/event/permissions";
import { showToast } from "@/utils/alert";
import { useTranslations } from "next-intl";
import React, { useCallback, useEffect, useState } from "react";

export default function EventTeamPage() {
  const t = useTranslations("team");
  const { user } = useAuth();
  const { workspace } = useEventWorkspace();

  const [subUsers, setSubUsers] = useState<EventSubUserItem[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteMailFailed, setInviteMailFailed] = useState(false);

  const [selectedSubUser, setSelectedSubUser] =
    useState<EventSubUserItem | null>(null);

  const {
    isOpen: isPermOpen,
    openModal: openPermModal,
    closeModal: closePermModal,
  } = useModal();

  const {
    isOpen: isInviteOpen,
    openModal: openInviteModal,
    closeModal: closeInviteModal,
  } = useModal();

  const fetchSubUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.get<SubUsersListResponse>("/event/sub-users");
      setSubUsers(data.subUsers);
      setCanManage(data.canManageSubUsers);
    } catch {
      setError(t("loadError"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (user) {
      void fetchSubUsers();
    }
  }, [user, fetchSubUsers]);

  const handleEditPermissions = (subUser: EventSubUserItem) => {
    setSelectedSubUser(subUser);
    openPermModal();
  };

  const handleSavePermissions = async (
    subUserId: string,
    roleName: string,
    permissions: EventPermissionMatrix,
  ) => {
    // Trust the PATCH payload returned by the BFF. A full list refetch against
    // the ephemeral Vercel mock can land on another instance and fall back to
    // legacy role_permissions (e.g. Form Manager → event restricted + others
    // can_edit), wiping the view_only / toggle values the user just saved.
    const updated = await api.patch<EventSubUserItem>(
      `/event/sub-users/${subUserId}`,
      {
        roleName,
        permissions,
      },
    );
    setSubUsers((prev) =>
      prev.map((row) =>
        row.id === updated.id ? { ...row, ...updated } : row,
      ),
    );
    setSelectedSubUser((prev) =>
      prev && prev.id === updated.id ? { ...prev, ...updated } : prev,
    );
    showToast({ title: t("updateSuccess"), variant: "success" });
  };

  const handleInviteSubUser = async (input: InviteSubUserInput) => {
    const result = await api.post<InviteSubUserResult>(
      "/event/sub-users",
      input,
    );
    setInviteMailFailed(!result.inviteSent);
    setSubUsers((prev) => {
      if (prev.some((row) => row.id === result.id)) {
        return prev.map((row) =>
          row.id === result.id ? { ...row, ...result } : row,
        );
      }
      return [...prev, result];
    });
    showToast({ title: t("inviteSuccess"), variant: "success" });
  };

  const handleRemoveSubUser = async (subUserId: string) => {
    try {
      await api.delete(`/event/sub-users/${subUserId}`);
      setSubUsers((prev) => prev.filter((row) => row.id !== subUserId));
      showToast({ title: t("removeSuccess"), variant: "success" });
    } catch {
      showToast({ title: t("updateError"), variant: "error" });
    }
  };

  return (
    <div className="min-w-0 space-y-6">
      {inviteMailFailed && (
        <p
          role="alert"
          className="rounded-xl bg-warning-50 p-4 text-sm text-warning-700 dark:bg-warning-950/40 dark:text-warning-300"
        >
          {t("inviteMailFailed")}
        </p>
      )}

      {error ? (
        <div className="rounded-2xl border border-error-200 bg-white p-6 text-sm text-error-700 dark:border-error-900/50 dark:bg-gray-900 dark:text-error-300">
          {error}
        </div>
      ) : isLoading ? (
        <TeamListSkeleton />
      ) : (
        <SubUsersTable
          subUsers={subUsers}
          canManage={canManage}
          currentUserId={user?.id}
          onEditPermissions={handleEditPermissions}
          onInviteClick={openInviteModal}
          onRemove={handleRemoveSubUser}
        />
      )}

      <PermissionModal
        isOpen={isPermOpen}
        onClose={closePermModal}
        subUser={selectedSubUser}
        eventName={workspace?.eventName}
        onSave={handleSavePermissions}
      />

      <InviteSubUserModal
        isOpen={isInviteOpen}
        onClose={closeInviteModal}
        onInvite={handleInviteSubUser}
      />
    </div>
  );
}

function TeamListSkeleton() {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-event-border bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900"
      aria-busy="true"
    >
      <div className="flex flex-col gap-3 border-b border-event-border p-5 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-3.5 w-72 max-w-full" />
        </div>
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-start text-sm">
          <thead>
            <tr className="border-b border-event-border bg-event-subtle dark:border-gray-800 dark:bg-gray-800/50">
              {Array.from({ length: 5 }).map((_, index) => (
                <th key={index} className="px-5 py-3.5">
                  <Skeleton className="h-3 w-16" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-event-border dark:divide-gray-800">
            {Array.from({ length: 4 }).map((_, row) => (
              <tr key={row}>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-9 shrink-0 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-40" />
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <Skeleton className="h-5 w-20 rounded-md" />
                </td>
                <td className="px-5 py-4">
                  <Skeleton className="h-5 w-16 rounded-full" />
                </td>
                <td className="px-5 py-4">
                  <div className="flex flex-wrap gap-1.5">
                    <Skeleton className="h-5 w-24 rounded" />
                    <Skeleton className="h-5 w-28 rounded" />
                    <Skeleton className="h-5 w-24 rounded" />
                  </div>
                </td>
                <td className="px-5 py-4">
                  <div className="flex justify-end gap-2">
                    <Skeleton className="size-8 rounded-lg" />
                    <Skeleton className="size-8 rounded-lg" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
