"use client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import InviteSubUserModal from "@/components/event/team/InviteSubUserModal";
import PermissionModal from "@/components/event/team/PermissionModal";
import SubUsersTable from "@/components/event/team/SubUsersTable";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/core/api";
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
    <div className="space-y-6">
      <PageBreadcrumb pageTitle={t("pageTitle")} />

      {error ? (
        <div className="rounded-2xl border border-error-200 bg-error-50 p-6 text-sm text-error-700 dark:border-error-900/50 dark:bg-error-950/40 dark:text-error-300">
          {error}
        </div>
      ) : isLoading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-white/3 dark:text-gray-400">
          {t("loading")}
        </div>
      ) : (
        <SubUsersTable
          subUsers={subUsers}
          canManage={canManage}
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
