"use client";

import PlatformAccessModal from "@/components/admin/PlatformAccessModal";
import UserActivityProfileModal from "@/components/admin/activity/UserActivityProfileModal";
import Button from "@/components/ui/button/Button";
import { TableBodySkeleton } from "@/components/ui/skeleton/Skeleton";
import { useAuth } from "@/context/AuthContext";
import { api, ApiError } from "@/core/api";
import { canAccessAdmin } from "@/core/auth";
import { useConfirm } from "@/hooks/useConfirm";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type {
  AdminUserListItem,
  AdminUsersResponse,
  PlatformAccessMatrix,
} from "@/types/admin/users";
import type { UserRole } from "@/types/user";
import { showToast } from "@/utils/alert";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EllipsisHorizontalIcon,
  EyeIcon,
  KeyIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  TrashIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const ROLE_OPTIONS: Array<{ key: UserRole; labelKey: string }> = [
  { key: "super_admin", labelKey: "super_admin" },
  { key: "event_owner", labelKey: "event_owner" },
  { key: "sub_user", labelKey: "sub_user" },
];

/** Event Editor must already have an event before switching into that role. */
function needsEvent(role: UserRole): boolean {
  return role === "sub_user";
}

/** Event Owner and Event Editor can change assigned event from the table. */
function canAssignEvent(role: UserRole): boolean {
  return role === "event_owner" || role === "sub_user";
}

const THAI_MONTHS = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

function formatLastActive(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    const day = d.getDate();
    const month = THAI_MONTHS[d.getMonth()];
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${day} ${month} ${hours}:${minutes}`;
  } catch {
    return "—";
  }
}

function getPageNumbers(
  currentPage: number,
  totalPages: number,
): (number | "...")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "...", totalPages];
  }
  if (currentPage >= totalPages - 3) {
    return [
      1,
      "...",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }
  return [
    1,
    "...",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "...",
    totalPages,
  ];
}

export default function UsersTable() {
  const t = useTranslations("adminUsers");
  const te = useTranslations("adminEvents");
  const tc = useTranslations("confirm");
  const ti = useTranslations("eventInspection");
  const locale = useLocale() as Locale;
  const { confirm } = useConfirm();
  const {
    realUser,
    inspectEvent,
    canViewActivity,
    canInspection,
    refreshAuth,
  } = useAuth();

  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [events, setEvents] = useState<Array<{ id: string; title: string }>>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole | "all">("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Dropdowns per row
  const [openRoleMenuId, setOpenRoleMenuId] = useState<string | null>(null);
  const [openEventMenuId, setOpenEventMenuId] = useState<string | null>(null);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Modals & Action Pending
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [platformUser, setPlatformUser] = useState<AdminUserListItem | null>(
    null,
  );

  const containerRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsFilterOpen(false);
        setOpenRoleMenuId(null);
        setOpenEventMenuId(null);
        setOpenActionMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fetch Users & Events
  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (selectedRole !== "all") params.set("role", selectedRole);
      params.set("locale", locale);

      const data = await api.get<AdminUsersResponse>(
        `/admin/users?${params.toString()}`,
      );
      setUsers(data.users);
      if (data.events) {
        setEvents(data.events);
      }
    } catch {
      setError(t("loadError"));
      showToast({ title: t("loadError"), variant: "error" });
    } finally {
      setIsLoading(false);
    }
  }, [locale, selectedRole, t]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  // Client-side filtering by search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase().trim();
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    );
  }, [searchQuery, users]);

  // Pagination slice
  const totalUsers = filteredUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalUsers / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalUsers);
  const paginatedUsers = useMemo(
    () => filteredUsers.slice(startIndex, endIndex),
    [filteredUsers, startIndex, endIndex],
  );

  // Reset page when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedRole]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // System Action: Change Role
  const handleChangeRole = async (
    target: AdminUserListItem,
    newRole: UserRole,
  ) => {
    setOpenRoleMenuId(null);
    if (target.role === newRole) return;
    if (needsEvent(newRole) && !target.eventId) {
      showToast({ title: t("form.eventRequired"), variant: "error" });
      return;
    }

    const prevUsers = [...users];
    setUsers((current) =>
      current.map((u) =>
        u.id === target.id
          ? {
              ...u,
              role: newRole,
              ...(newRole === "super_admin"
                ? { eventId: null, eventName: null }
                : {}),
            }
          : u,
      ),
    );

    try {
      await api.patch(`/admin/users/${encodeURIComponent(target.id)}`, {
        role: newRole,
        ...(newRole === "super_admin" ? { eventId: null } : {}),
      });
      showToast({ title: t("changeRoleSuccess"), variant: "success" });
      await fetchUsers();
    } catch (err) {
      setUsers(prevUsers);
      if (err instanceof ApiError && err.code === "EVENT_REQUIRED") {
        showToast({ title: t("form.eventRequired"), variant: "error" });
      } else {
        showToast({ title: t("changeRoleError"), variant: "error" });
      }
    }
  };

  // System Action: Assign / Change Event (event roles only)
  const handleAssignEvent = async (
    target: AdminUserListItem,
    newEventId: string,
  ) => {
    setOpenEventMenuId(null);
    if (!canAssignEvent(target.role)) return;
    const selectedEvent = events.find((e) => e.id === newEventId);
    if (!selectedEvent) return;
    const prevUsers = [...users];

    setUsers((current) =>
      current.map((u) =>
        u.id === target.id
          ? {
              ...u,
              eventId: newEventId,
              eventName: selectedEvent.title,
            }
          : u,
      ),
    );

    try {
      await api.patch(`/admin/users/${encodeURIComponent(target.id)}`, {
        eventId: newEventId,
      });
      showToast({ title: t("assignEventSuccess"), variant: "success" });
    } catch {
      setUsers(prevUsers);
      showToast({ title: t("assignEventError"), variant: "error" });
    }
  };

  const handleDeleteUser = async (target: AdminUserListItem) => {
    setOpenActionMenuId(null);
    if (realUser?.id === target.id) {
      showToast({ title: t("form.cannotDeleteSelf"), variant: "error" });
      return;
    }
    const confirmed = await confirm({
      title: t("form.deleteTitle"),
      message: t("form.deleteConfirm", { name: target.name }),
      confirmLabel: t("form.deleteSubmit"),
      cancelLabel: tc("cancel"),
      variant: "danger",
    });
    if (!confirmed) return;

    try {
      await api.delete(`/admin/users/${encodeURIComponent(target.id)}`);
      showToast({ title: t("form.deleteSuccess"), variant: "success" });
      await fetchUsers();
    } catch {
      showToast({ title: t("form.deleteError"), variant: "error" });
    }
  };

  // Action: Open event workspace (Inspect)
  const openWorkspace = async (target: AdminUserListItem) => {
    setOpenActionMenuId(null);
    if (!target.eventId || !realUser || !canAccessAdmin(realUser.role)) return;
    const confirmed = await confirm({
      title: tc("inspectTitle"),
      message: ti("confirmStart", {
        event: target.eventName?.trim() || ti("unnamedEvent"),
      }),
      confirmLabel: te("openWorkspace"),
      cancelLabel: tc("cancel"),
      variant: "warning",
    });
    if (!confirmed) return;

    setPendingId(target.id);
    try {
      await inspectEvent(target.eventId);
    } catch {
      showToast({ title: te("openWorkspaceError"), variant: "error" });
    } finally {
      setPendingId(null);
    }
  };

  // Badge styling matching Figma
  const getRoleBadgeClasses = (role: UserRole) => {
    switch (role) {
      case "super_admin":
        return "bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-400 hover:bg-emerald-100/70";
      case "event_owner":
        return "bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-400 hover:bg-amber-100/70";
      case "sub_user":
      default:
        return "bg-purple-50 text-purple-600 border border-purple-200 dark:bg-purple-950/40 dark:border-purple-800 dark:text-purple-400 hover:bg-purple-100/70";
    }
  };

  return (
    <div ref={containerRef} className="space-y-4">
      {/* Main Figma Card */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-theme-xs sm:p-8 dark:border-gray-800 dark:bg-gray-900">
        {/* Card Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {t("workspaceUsers")}
            </h2>
            <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
              {t("workspaceUsersSubtitle")}
            </p>
          </div>

          {/* Search, Filter, Create */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3 text-gray-400">
                <MagnifyingGlassIcon className="size-4" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="h-9 w-48 rounded-lg border border-gray-200 bg-white ps-9 pe-3 text-xs text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none sm:w-60 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
              />
            </div>

            {/* Filter Dropdown Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsFilterOpen((prev) => !prev)}
                className="dark:hover:bg-gray-750 inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                <span>{t("filterButton")}</span>
                <ChevronDownIcon className="size-3.5 text-gray-400" />
              </button>

              {isFilterOpen && (
                <div className="absolute end-0 z-50 mt-1.5 w-44 rounded-xl border border-gray-100 bg-white py-1.5 shadow-theme-lg dark:border-gray-700 dark:bg-gray-800">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRole("all");
                      setIsFilterOpen(false);
                    }}
                    className="flex w-full items-center justify-between px-3.5 py-2 text-start text-xs font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
                  >
                    <span>{t("filters.all")}</span>
                    {selectedRole === "all" && (
                      <CheckIcon className="size-4 text-brand-500" />
                    )}
                  </button>
                  {ROLE_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => {
                        setSelectedRole(opt.key);
                        setIsFilterOpen(false);
                      }}
                      className="flex w-full items-center justify-between px-3.5 py-2 text-start text-xs font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
                    >
                      <span>{t(`filters.${opt.labelKey}`)}</span>
                      {selectedRole === opt.key && (
                        <CheckIcon className="size-4 text-brand-500" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Link href="/admin/users/new">
              <Button size="sm">+ {t("form.createButton")}</Button>
            </Link>
          </div>
        </div>

        {/* Table Container — drop overflow while a row menu is open so absolute menus are not clipped (short filtered lists). */}
        <div
          className={
            openActionMenuId || openRoleMenuId || openEventMenuId
              ? "overflow-visible"
              : "overflow-x-auto"
          }
        >
          <table className="w-full min-w-[760px] text-start">
            <thead>
              <tr className="border-b border-gray-100 text-start text-xs font-medium text-gray-500 dark:border-gray-800 dark:text-gray-400">
                <th className="pb-3 text-start font-medium">
                  {t("columns.user")}
                </th>
                <th className="pb-3 text-start font-medium">
                  {t("columns.role")}
                </th>
                <th className="pb-3 text-start font-medium">
                  {t("columns.assignedEvent")}
                </th>
                <th className="pb-3 text-start font-medium">
                  {t("columns.lastActive")}
                </th>
                <th className="pe-2 pb-3 text-end font-medium">
                  {t("columns.actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
              {isLoading ? (
                <TableBodySkeleton rows={5} columns={5} />
              ) : error ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-8 text-center text-sm text-error-500"
                  >
                    {error}
                  </td>
                </tr>
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-12 text-center text-sm text-gray-400 dark:text-gray-500"
                  >
                    {t("empty")}
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => {
                  const initial = (user.name || user.email || "U")
                    .charAt(0)
                    .toUpperCase();
                  const isRoleOpen = openRoleMenuId === user.id;
                  const isEventOpen = openEventMenuId === user.id;
                  const isActionOpen = openActionMenuId === user.id;

                  return (
                    <tr
                      key={user.id}
                      className="transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-800/40"
                    >
                      {/* 1. User Column */}
                      <td className="py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-purple-700 text-sm font-semibold text-white shadow-sm">
                            {initial}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900 dark:text-white">
                              {user.name}
                            </div>
                            <div className="text-xs text-gray-400 dark:text-gray-500">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Role Column (Dropdown Pill) */}
                      <td className="py-3.5">
                        <div className="relative inline-block text-start">
                          <button
                            type="button"
                            onClick={() => {
                              setOpenRoleMenuId((prev) =>
                                prev === user.id ? null : user.id,
                              );
                              setOpenEventMenuId(null);
                              setOpenActionMenuId(null);
                            }}
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${getRoleBadgeClasses(
                              user.role,
                            )}`}
                          >
                            <span>{t(`filters.${user.role}`)}</span>
                            <ChevronDownIcon className="size-3 shrink-0" />
                          </button>

                          {isRoleOpen && (
                            <div className="absolute start-0 z-50 mt-1.5 w-40 rounded-xl border border-gray-100 bg-white py-1 shadow-theme-lg dark:border-gray-700 dark:bg-gray-800">
                              {ROLE_OPTIONS.map((opt) => (
                                <button
                                  key={opt.key}
                                  type="button"
                                  onClick={() =>
                                    void handleChangeRole(user, opt.key)
                                  }
                                  className="flex w-full items-center justify-between px-3 py-1.5 text-start text-xs font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
                                >
                                  <span>{t(`filters.${opt.labelKey}`)}</span>
                                  {user.role === opt.key && (
                                    <CheckIcon className="size-3.5 text-brand-500" />
                                  )}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 3. Assigned Event — select for Event Owner / Event Editor */}
                      <td className="py-3.5">
                        {canAssignEvent(user.role) ? (
                          <div className="relative inline-block text-start">
                            <button
                              type="button"
                              onClick={() => {
                                setOpenEventMenuId((prev) =>
                                  prev === user.id ? null : user.id,
                                );
                                setOpenRoleMenuId(null);
                                setOpenActionMenuId(null);
                              }}
                              className="inline-flex h-9 max-w-[240px] min-w-[170px] items-center justify-between gap-2 rounded-lg border border-purple-400 bg-white px-3 text-xs font-medium text-gray-800 shadow-theme-xs transition-colors hover:border-purple-600 dark:border-purple-600/70 dark:bg-gray-800 dark:text-gray-200"
                            >
                              <span className="truncate">
                                {user.eventName || t("noAssignedEvent")}
                              </span>
                              <ChevronDownIcon className="size-3.5 shrink-0 text-purple-600 dark:text-purple-400" />
                            </button>

                            {isEventOpen && (
                              <div className="custom-scrollbar absolute start-0 z-50 mt-1.5 max-h-56 w-60 overflow-y-auto rounded-xl border border-gray-100 bg-white py-1 shadow-theme-lg dark:border-gray-700 dark:bg-gray-800">
                                {events.map((evt) => (
                                  <button
                                    key={evt.id}
                                    type="button"
                                    onClick={() =>
                                      void handleAssignEvent(user, evt.id)
                                    }
                                    className="flex w-full items-center justify-between px-3.5 py-2 text-start text-xs font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
                                  >
                                    <span className="truncate">{evt.title}</span>
                                    {user.eventId === evt.id && (
                                      <CheckIcon className="size-3.5 text-purple-600" />
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            —
                          </span>
                        )}
                      </td>

                      {/* 4. Last Active Column */}
                      <td className="py-3.5 text-xs text-gray-700 dark:text-gray-300">
                        {formatLastActive(user.lastActiveAt || user.updatedAt)}
                      </td>

                      {/* 5. Actions Column (••• Menu) */}
                      <td className="py-3.5 pe-2 text-end">
                        <div className="relative inline-block text-start">
                          <button
                            type="button"
                            onClick={() => {
                              setOpenActionMenuId((prev) =>
                                prev === user.id ? null : user.id,
                              );
                              setOpenRoleMenuId(null);
                              setOpenEventMenuId(null);
                            }}
                            className="inline-flex size-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                          >
                            <EllipsisHorizontalIcon className="size-5" />
                          </button>

                          {isActionOpen && (
                            <div className="absolute end-0 z-50 mt-1 w-48 rounded-xl border border-gray-100 bg-white py-1.5 shadow-theme-lg dark:border-gray-700 dark:bg-gray-800">
                              <Link
                                href={`/admin/users/${user.id}/edit`}
                                onClick={() => setOpenActionMenuId(null)}
                                className="flex w-full items-center gap-2 px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
                              >
                                <PencilSquareIcon className="size-4 text-gray-400" />
                                <span>{t("actions.edit")}</span>
                              </Link>

                              {/* Inspect Workspace */}
                              {canInspection && Boolean(user.eventId) ? (
                                <button
                                  type="button"
                                  disabled={pendingId === user.id}
                                  onClick={() => void openWorkspace(user)}
                                  className="flex w-full items-center gap-2 px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
                                >
                                  <EyeIcon className="size-4 text-gray-400" />
                                  <span>{t("actions.inspect")}</span>
                                </button>
                              ) : null}

                              {/* View Activity */}
                              {canViewActivity && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setProfileUserId(user.id);
                                    setOpenActionMenuId(null);
                                  }}
                                  className="flex w-full items-center gap-2 px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
                                >
                                  <UserCircleIcon className="size-4 text-gray-400" />
                                  <span>{t("actions.activity")}</span>
                                </button>
                              )}

                              {/* Edit Platform Access */}
                              {user.role === "super_admin" && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPlatformUser(user);
                                    setOpenActionMenuId(null);
                                  }}
                                  className="flex w-full items-center gap-2 px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
                                >
                                  <KeyIcon className="size-4 text-gray-400" />
                                  <span>{t("actions.platformAccess")}</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => void handleDeleteUser(user)}
                                className="flex w-full items-center gap-2 px-3.5 py-2 text-xs font-medium text-error-600 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-950/30"
                              >
                                <TrashIcon className="size-4" />
                                <span>{t("actions.delete")}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Card Footer (Showing X-Y of Z + Pagination) */}
        <div className="mt-6 flex flex-col gap-4 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
          <div className="text-xs text-gray-400 dark:text-gray-500">
            {t("showingCount", {
              start: totalUsers === 0 ? 0 : startIndex + 1,
              end: endIndex,
              total: totalUsers,
            })}
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center gap-2.5 text-xs sm:gap-3">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="inline-flex size-6 items-center justify-center text-gray-500 transition-colors hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-30 dark:text-gray-400 dark:hover:text-white"
              aria-label="Previous page"
            >
              <ChevronLeftIcon className="size-3.5" />
            </button>

            {getPageNumbers(currentPage, totalPages).map((item, idx) => {
              if (item === "...") {
                return (
                  <span
                    key={`ellipsis-${idx}`}
                    className="inline-flex min-w-[20px] items-center justify-center px-1 text-xs text-gray-400 select-none dark:text-gray-500"
                  >
                    …
                  </span>
                );
              }
              const pageNum = item;
              const isActive = pageNum === currentPage;
              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setCurrentPage(pageNum)}
                  className={`inline-flex min-w-[20px] items-center justify-center px-1 text-xs transition-colors ${
                    isActive
                      ? "font-bold text-gray-900 dark:text-white"
                      : "font-normal text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex size-6 items-center justify-center text-gray-500 transition-colors hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-30 dark:text-gray-400 dark:hover:text-white"
              aria-label="Next page"
            >
              <ChevronRightIcon className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Activity Profile Modal */}
      <UserActivityProfileModal
        userId={profileUserId}
        displayUser={users.find((user) => user.id === profileUserId)}
        isOpen={Boolean(profileUserId)}
        onClose={() => setProfileUserId(null)}
      />

      {/* Platform Access Modal */}
      <PlatformAccessModal
        user={platformUser}
        isOpen={Boolean(platformUser)}
        onClose={() => setPlatformUser(null)}
        onSaved={(userId: string, matrix: PlatformAccessMatrix) => {
          setUsers((prev) =>
            prev.map((row) =>
              row.id === userId
                ? {
                    ...row,
                    platformAccess: matrix,
                    canViewActivity: matrix.canViewActivity,
                    canInspection: matrix.canInspection,
                  }
                : row,
            ),
          );
          if (realUser?.id === userId) {
            void refreshAuth();
          }
          showToast({ title: t("platformAccessSaved"), variant: "success" });
        }}
      />

    </div>
  );
}
