"use client";

import SelectField from "@/components/form/SelectField";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { api, ApiError } from "@/core/api";
import type { AdminUserListItem } from "@/types/admin/users";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";

type Candidate = Pick<AdminUserListItem, "id" | "name" | "email">;

export default function ExistingTrialAccountModal({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: () => void;
}) {
  const t = useTranslations("platformConfiguration");
  const common = useTranslations("common");
  const titleId = useId();
  const fieldId = useId();
  const noticeId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [candidates, setCandidates] = useState<
    Candidate[] | "loading" | "error"
  >("loading");
  const [attempt, setAttempt] = useState(0);
  const [selected, setSelected] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<
    "trialUserIneligible" | "addExistingTrialError" | null
  >(null);

  useEffect(() => {
    const heading = headingRef.current;
    const previous = heading?.ownerDocument.activeElement;
    heading?.focus();
    return () => {
      if (previous instanceof globalThis.HTMLElement && previous.isConnected)
        previous.focus();
    };
  }, []);

  useEffect(() => {
    const request = new AbortController();
    api
      .get<{ users: Candidate[] }>(
        "/admin/users?trial=eligible",
        request.signal,
      )
      .then(({ users }) => {
        if (!request.signal.aborted) setCandidates(users);
      })
      .catch(() => {
        if (!request.signal.aborted) setCandidates("error");
      });
    return () => request.abort();
  }, [attempt]);

  async function addAccount() {
    if (!selected || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      await api.patch(
        `/admin/users/${encodeURIComponent(selected)}?trial=true`,
        { isTrial: true },
      );
      onAdded();
    } catch (error) {
      if (
        error instanceof ApiError &&
        (error.status === 404 || error.code === "TRIAL_USER_INELIGIBLE")
      ) {
        setSaveError("trialUserIneligible");
        setSelected("");
        setCandidates("loading");
        setAttempt((count) => count + 1);
      } else {
        setSaveError("addExistingTrialError");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      isOpen
      labelledBy={titleId}
      showCloseButton={false}
      onClose={saving ? () => undefined : onClose}
    >
      <form
        className="space-y-4"
        aria-busy={saving || candidates === "loading"}
        onSubmit={(event) => {
          event.preventDefault();
          void addAccount();
        }}
      >
        <h2
          ref={headingRef}
          id={titleId}
          tabIndex={-1}
          className="text-lg font-semibold text-gray-900 dark:text-white"
        >
          {t("addExistingTrialAccount")}
        </h2>
        <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
          <label htmlFor={fieldId} className="block font-medium">
            {t("existingTrialUser")}
          </label>
          <SelectField
            id={fieldId}
            value={selected}
            required
            aria-describedby={noticeId}
            disabled={
              saving || !Array.isArray(candidates) || candidates.length === 0
            }
            onChange={(event) => {
              setSelected(event.target.value);
              setSaveError(null);
            }}
          >
            <option value="">{t("selectExistingTrialUser")}</option>
            {Array.isArray(candidates) &&
              candidates.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name ? `${user.name} (${user.email})` : user.email}
                </option>
              ))}
          </SelectField>
          <p id={noticeId}>{t("existingTrialNotice")}</p>
          {candidates === "loading" && (
            <p role="status">{t("loadingExistingTrialUsers")}</p>
          )}
          {Array.isArray(candidates) && candidates.length === 0 && (
            <p role="status">{t("noExistingTrialUsers")}</p>
          )}
          {candidates === "error" && (
            <div className="space-y-2">
              <p role="alert">{t("loadExistingTrialUsersError")}</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setCandidates("loading");
                  setAttempt((count) => count + 1);
                }}
              >
                {t("retry")}
              </Button>
            </div>
          )}
          {saveError && (
            <p role="alert" className="text-error-600 dark:text-error-400">
              {t(saveError)}
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={saving}
            onClick={onClose}
          >
            {common("cancel")}
          </Button>
          <Button size="sm" type="submit" disabled={!selected || saving}>
            {t("addTrialAccount")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
