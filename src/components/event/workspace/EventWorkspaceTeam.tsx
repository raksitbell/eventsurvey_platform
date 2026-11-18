"use client";

import { useAuth } from "@/context/AuthContext";
import { Link } from "@/i18n/navigation";
import type { EventWorkspace } from "@/types/event/workspace";
import { useTranslations } from "next-intl";
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
  const s = useTranslations("eventSetup");
  const overview = useTranslations("eventOverview");
  const { user } = useAuth();
  const isOwner = workspace.userRole === "event_owner";
  const content = (
    <>
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
    </>
  );

  return (
    <div className="workspace-team">
      {isOwner ? (
        <Link href="/event/team" className="workspace-team__card">
          {content}
        </Link>
      ) : (
        <div className="workspace-team__card" aria-disabled="true">
          {content}
        </div>
      )}
    </div>
  );
}
