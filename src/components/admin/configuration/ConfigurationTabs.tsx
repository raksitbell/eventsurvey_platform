"use client";

import EventsTable from "@/components/admin/events/EventsTable";
import { useAuth } from "@/context/AuthContext";
import { TrashIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import type { KeyboardEvent } from "react";
import TrialAccountsTable from "./TrialAccountsTable";

type Tab = "trash" | "trial-accounts";

export default function ConfigurationTabs() {
  const t = useTranslations("platformConfiguration");
  const eventText = useTranslations("adminEvents.trash");
  const { canViewEvents, canViewUsers } = useAuth();
  const params = useSearchParams();
  const tabs = [
    { id: "trash", label: eventText("title"), Icon: TrashIcon, visible: canViewEvents },
    { id: "trial-accounts", label: t("trialAccounts"), Icon: UserGroupIcon, visible: canViewUsers },
  ] as const;
  const visibleTabs = tabs.filter((tab) => tab.visible);
  const activeTab = visibleTabs.find((tab) => tab.id === params.get("tab")) ?? visibleTabs[0];
  if (!activeTab) return null;
  const activeId = activeTab.id;

  function selectTab(id: Tab) {
    if (id === activeId) return;
    const url = new URL(globalThis.location.href);
    url.searchParams.set("tab", id);
    globalThis.history.pushState(null, "", url);
  }

  function navigateTabs(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = visibleTabs.length - 1;
    let next: number;
    switch (event.key) {
      case "Home":
        next = 0;
        break;
      case "End":
        next = last;
        break;
      case "ArrowLeft":
        next = index === 0 ? last : index - 1;
        break;
      case "ArrowRight":
        next = index === last ? 0 : index + 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    const { id } = visibleTabs[next];
    selectTab(id);
    event.currentTarget.ownerDocument.getElementById(`configuration-tab-${id}`)?.focus();
  }

  return (
    <div className="min-w-0 space-y-4">
      <div
        role="tablist"
        aria-label={t("title")}
        className="inline-flex max-w-full gap-1 rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-900"
      >
        {visibleTabs.map(({ id, label, Icon }, index) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`configuration-tab-${id}`}
            aria-selected={activeId === id}
            aria-controls={`configuration-panel-${id}`}
            tabIndex={activeId === id ? 0 : -1}
            onClick={() => selectTab(id)}
            onKeyDown={(event) => navigateTabs(event, index)}
            className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 focus-visible:outline-brand-500 aria-selected:bg-brand-50 aria-selected:text-brand-700 dark:text-gray-300 dark:hover:bg-gray-800 dark:aria-selected:bg-brand-500/15 dark:aria-selected:text-brand-300"
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>
      {visibleTabs.map(({ id }) => (
        <div
          key={id}
          role="tabpanel"
          id={`configuration-panel-${id}`}
          aria-labelledby={`configuration-tab-${id}`}
          hidden={activeId !== id}
        >
          {activeId === id && (id === "trash" ? <EventsTable showTrash /> : <TrialAccountsTable />)}
        </div>
      ))}
    </div>
  );
}
