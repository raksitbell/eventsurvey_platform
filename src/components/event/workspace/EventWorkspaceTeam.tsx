"use client";

import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { useAuth } from "@/context/AuthContext";
import type { EventWorkspace } from "@/types/event/workspace";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import WorkspaceIcon from "./WorkspaceIcon";
import "./workspace-details.css";

interface EventWorkspaceTeamProps {
  workspace: EventWorkspace;
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => Array.from(part)[0])
    .join("")
    .toLocaleUpperCase();
}

export default function EventWorkspaceTeam({
  workspace,
}: EventWorkspaceTeamProps) {
  const t = useTranslations("eventHome");
  const s = useTranslations("eventSetup");
  const overview = useTranslations("eventOverview");
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const listId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const isOwner = workspace.userRole === "event_owner";

  useEffect(() => {
    if (!open) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    globalThis.document.addEventListener("keydown", onEscape);
    return () => globalThis.document.removeEventListener("keydown", onEscape);
  }, [open]);

  return (
    <div className="workspace-team">
      <button
        ref={trigger}
        type="button"
        className="workspace-team__card dropdown-toggle"
        aria-controls={open ? listId : undefined}
        aria-expanded={isOwner ? open : undefined}
        disabled={!isOwner}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="workspace-team__heading">
          <WorkspaceIcon name="icon-outline-user-group" size={20} />
          <span>{s("team")}</span>
          <WorkspaceIcon
            name="icon-outline-chevron-right-open-user-management"
            size={18}
            directional
          />
        </span>
        <span className="workspace-team__context">
          <span className="workspace-team__avatars" aria-hidden="true">
            <span className="workspace-team__avatar workspace-team__avatar--owner">
              {user?.name ? (
                initials(user.name)
              ) : (
                <WorkspaceIcon name="icon-outline-user-placeholder" size={18} />
              )}
            </span>
            <span className="workspace-team__avatar workspace-team__avatar--member">
              {workspace.subUsers[0] ? (
                initials(workspace.subUsers[0].name)
              ) : (
                <WorkspaceIcon name="icon-outline-user-placeholder" size={18} />
              )}
            </span>
            <span className="workspace-team__avatar workspace-team__avatar--more">
              {workspace.subUsers.length > 1 ? (
                `+${workspace.subUsers.length - 1}`
              ) : (
                <WorkspaceIcon name="icon-outline-plus-invite-user" size={18} />
              )}
            </span>
          </span>
          <span className="workspace-team__hint">
            <strong>{overview("teamTitle")}</strong>
            <span>{overview("teamHint")}</span>
          </span>
        </span>
      </button>
      {isOwner && (
        <Dropdown
          isOpen={open}
          onClose={() => setOpen(false)}
          className="inset-s-0 top-full mt-2 max-h-64 overflow-y-auto p-4"
        >
          <section id={listId} aria-label={t("teamTitle")}>
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              {t("teamTitle")}
            </h3>
            {workspace.subUsers.length ? (
              <ul className="mt-2 space-y-2">
                {workspace.subUsers.map((member) => (
                  <li
                    key={member.id}
                    className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200"
                  >
                    <span
                      aria-hidden="true"
                      className="workspace-team__avatar workspace-team__avatar--member"
                    >
                      {initials(member.name)}
                    </span>
                    <span className="min-w-0 wrap-anywhere">{member.name}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {t("noTeam")}
              </p>
            )}
          </section>
        </Dropdown>
      )}
    </div>
  );
}
