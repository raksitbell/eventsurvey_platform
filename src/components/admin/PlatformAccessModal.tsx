"use client";

import Switch from "@/components/form/switch/Switch";
import { Modal } from "@/components/ui/modal";
import { api } from "@/core/api";
import type {
  AdminUserListItem,
  PlatformAccessFlags,
} from "@/types/admin/users";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

type Props = {
  user: AdminUserListItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (userId: string, flags: PlatformAccessFlags) => void;
};

export default function PlatformAccessModal({
  user,
  isOpen,
  onClose,
  onSaved,
}: Props) {
  const t = useTranslations("adminUsers");
  const tCommon = useTranslations("common");
  const [canViewActivity, setCanViewActivity] = useState(false);
  const [canInspection, setCanInspection] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !user) return;
    setCanViewActivity(user.canViewActivity === true);
    setCanInspection(user.canInspection === true);
    setError(null);
  }, [isOpen, user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      const flags = await api.patch<PlatformAccessFlags>(
        `/admin/users/${encodeURIComponent(user.id)}/platform-access`,
        { canViewActivity, canInspection },
      );
      onSaved(user.id, flags);
      onClose();
    } catch {
      setError(t("platformAccessSaveError"));
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-md p-6 sm:p-7"
      labelledBy="platform-access-title"
    >
      <div className="space-y-5">
        <div>
          <h2
            id="platform-access-title"
            className="text-xl font-semibold text-gray-900 dark:text-white"
          >
            {t("platformAccessTitle")}
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {user.name}
          </p>
        </div>

        <div className="space-y-4 rounded-xl border border-gray-200 p-4 dark:border-gray-700">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white/90">
                {t("platformFlags.canViewActivity")}
              </p>
              <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                {t("platformFlags.canViewActivityDesc")}
              </p>
            </div>
            <Switch
              id="platform-can-view-activity"
              label={t("platformFlags.canViewActivity")}
              checked={canViewActivity}
              onChange={setCanViewActivity}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white/90">
                {t("platformFlags.canInspection")}
              </p>
              <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                {t("platformFlags.canInspectionDesc")}
              </p>
            </div>
            <Switch
              id="platform-can-inspection"
              label={t("platformFlags.canInspection")}
              checked={canInspection}
              onChange={setCanInspection}
            />
          </div>
        </div>

        {error ? (
          <p className="text-sm text-error-600 dark:text-error-400">{error}</p>
        ) : null}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-200"
          >
            {tCommon("cancel")}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? t("platformAccessSaving") : tCommon("save")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
