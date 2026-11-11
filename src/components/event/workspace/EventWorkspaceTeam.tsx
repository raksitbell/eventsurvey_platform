"use client";

import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import type { EventWorkspace } from "@/types/event/workspace";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

interface EventWorkspaceTeamProps {
  workspace: EventWorkspace;
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => Array.from(part)[0])
    .slice(0, 2)
    .join("")
    .toLocaleUpperCase();
}

export default function EventWorkspaceTeam({
  workspace,
}: EventWorkspaceTeamProps) {
  const t = useTranslations("eventHome");
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    globalThis.document.addEventListener("keydown", onKeyDown);
    return () => globalThis.document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-5">
        <div>
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">
            {t("teamTitle")}
          </h3>
          <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
            {t("memberCount", { count: workspace.subUserCount })}
          </p>
        </div>
        <div className="flex -space-x-2 rtl:space-x-reverse">
          {workspace.subUsers.slice(0, 3).map((member) => (
            <span
              key={member.id}
              title={member.name}
              className="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-white bg-event-banner text-theme-sm font-semibold text-white dark:border-gray-900 dark:bg-brand-800"
            >
              {initials(member.name)}
            </span>
          ))}
          {workspace.subUsers.length > 3 && (
            <span className="flex size-10 items-center justify-center rounded-full border-2 border-white bg-event-tile text-theme-xs text-event-action dark:border-gray-900 dark:bg-gray-800 dark:text-gray-200">
              +{workspace.subUsers.length - 3}
            </span>
          )}
        </div>
      </div>
      {workspace.userRole === "event_owner" && (
        <div className="relative">
          <button
            type="button"
            aria-expanded={open}
            aria-controls="workspace-assistants"
            onClick={() => setOpen((value) => !value)}
            className="dropdown-toggle inline-flex items-center gap-2 rounded-lg border border-event-border bg-white px-4 py-2.5 text-theme-sm font-semibold text-gray-800 hover:bg-event-subtle dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            {t("manageTeam")}
            <ChevronDownIcon className="size-4" aria-hidden="true" />
          </button>
          <Dropdown
            isOpen={open}
            onClose={() => setOpen(false)}
            className="end-0 top-full mt-2 w-64 p-4"
          >
            <section id="workspace-assistants" aria-label={t("teamTitle")}>
              <h4 className="mb-3 text-theme-sm font-semibold text-gray-800 dark:text-gray-200">
                {t("teamTitle")}
              </h4>
              {workspace.subUsers.length ? (
                <ul className="max-h-60 space-y-3 overflow-y-auto">
                  {workspace.subUsers.map((member) => (
                    <li
                      key={member.id}
                      className="flex items-center gap-3 text-theme-sm text-gray-700 dark:text-gray-300"
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-event-banner text-white dark:bg-brand-800">
                        {initials(member.name)}
                      </span>
                      <span className="min-w-0 break-words">{member.name}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-theme-sm text-gray-500 dark:text-gray-400">
                  {t("noTeam")}
                </p>
              )}
            </section>
          </Dropdown>
        </div>
      )}
    </div>
  );
}
