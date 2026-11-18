"use client";

import InviteSubUserModal from "@/components/event/team/InviteSubUserModal";
import PermissionModal from "@/components/event/team/PermissionModal";
import SubUsersTable from "@/components/event/team/SubUsersTable";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/core/api";
import useEventWorkspace from "@/hooks/useEventWorkspace";
import { useModal } from "@/hooks/useModal";
import type {
  EventPermissionMatrix,
  EventSubUserItem,
  InviteSubUserInput,
  SubUsersListResponse,
} from "@/types/event/permissions";
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
    await api.patch<EventSubUserItem>(`/event/sub-users/${subUserId}`, {
      roleName,
      permissions,
    });
    await fetchSubUsers();
  };

  const handleInviteSubUser = async (input: InviteSubUserInput) => {
    await api.post<EventSubUserItem>("/event/sub-users", input);
    await fetchSubUsers();
  };

  const handleRemoveSubUser = async (subUserId: string) => {
    await api.delete(`/event/sub-users/${subUserId}`);
    await fetchSubUsers();
  };

  return (
    <div className="space-y-6 rounded-2xl bg-event-page p-4 sm:p-6 dark:bg-gray-950">
      <header>
        <p className="text-theme-xs font-bold tracking-wide text-event-action dark:text-brand-400">
          EVENT WORKSPACE
        </p>
        <h1 className="mt-1 text-title-sm font-semibold text-gray-900 dark:text-white/90">
          {t("pageTitle")}
        </h1>
        <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
          {t("teamMembersDesc")}
        </p>
      </header>

      {error ? (
        <div className="rounded-2xl border border-error-200 bg-white p-6 text-sm text-error-700 dark:border-error-900/50 dark:bg-gray-900 dark:text-error-300">
          {error}
        </div>
      ) : isLoading ? (
        <div className="rounded-2xl border border-event-border bg-white p-12 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
          {t("loading")}
        </div>
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

      {/* Permission Edit Modal */}
      <PermissionModal
        isOpen={isPermOpen}
        onClose={closePermModal}
        subUser={selectedSubUser}
        eventName={workspace?.eventName}
        onSave={handleSavePermissions}
      />

      {/* Invite Modal */}
      <InviteSubUserModal
        isOpen={isInviteOpen}
        onClose={closeInviteModal}
        onInvite={handleInviteSubUser}
      />
    </div>
  );
}
