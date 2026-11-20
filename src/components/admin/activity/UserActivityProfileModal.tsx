"use client";

import {
  actionBadgeClass,
  formatActivityTime,
  formatMetadata,
  translateActivityModule,
  type ActivityMetaTranslate,
} from "@/components/admin/activity/activity-format";
import { Modal } from "@/components/ui/modal";
import Skeleton from "@/components/ui/skeleton/Skeleton";
import { api } from "@/core/api";
import type {
  AdminUserActivityProfile,
  AdminUserEventMembership,
} from "@/types/admin/activity";
import type { EventPermissionMatrix } from "@/types/event/permissions";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

type Props = {
  userId: string | null;
  isOpen: boolean;
  onClose: () => void;
  /** Default `/admin/users` — event scope uses `/event/users`. */
  activityPathPrefix?: string;
  translationNamespace?: "adminActivity" | "eventActivity";
};

const MODULE_KEYS = [
  "event",
  "registrationForm",
  "surveyForm",
  "dashboard",
] as const;

const TOGGLE_KEYS = [
  "canViewSubmissions",
  "canManageSubmissions",
  "canExport",
  "canViewActivity",
] as const;

export default function UserActivityProfileModal({
  userId,
  isOpen,
  onClose,
  activityPathPrefix = "/admin/users",
  translationNamespace = "adminActivity",
}: Props) {
  const t = useTranslations(translationNamespace);
  const locale = useLocale();
  const translateMeta = useMemo<ActivityMetaTranslate>(
    () => (key, values) => t(key as never, values as never),
    [t],
  );
  const [profile, setProfile] = useState<AdminUserActivityProfile | null>(null);
  const [openEventId, setOpenEventId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !userId) {
      setProfile(null);
      setOpenEventId(null);
      setError(null);
      return;
    }

    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ locale });
        const data = await api.get<AdminUserActivityProfile>(
          `${activityPathPrefix}/${encodeURIComponent(userId!)}/activity?${params}`,
        );
        if (!cancelled) {
          setProfile(data);
          setOpenEventId(null);
        }
      } catch {
        if (!cancelled) {
          setError(t("profileLoadError"));
          setProfile(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [activityPathPrefix, isOpen, locale, t, userId]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-xl p-6 sm:p-7"
      labelledBy="user-activity-profile-title"
    >
      <div className="space-y-5" aria-busy={loading}>
        {loading && !profile ? (
          <>
            <h2 id="user-activity-profile-title" className="sr-only">
              {t("profileTitle")}
            </h2>
            <ProfileLoadingSkeleton />
          </>
        ) : (
          <>
            <div>
              <h2
                id="user-activity-profile-title"
                className="text-xl font-semibold text-gray-900 dark:text-white"
              >
                {profile?.user.name ?? t("profileTitle")}
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {profile?.user.roleLabel
                  ? [
                      "super_admin",
                      "event_owner",
                      "sub_user",
                      "participant",
                    ].includes(profile.user.roleLabel)
                    ? t(
                        `roles.${profile.user.roleLabel as "super_admin" | "event_owner" | "sub_user" | "participant"}`,
                      )
                    : profile.user.roleLabel
                  : t("profileSubtitle")}
              </p>
              {profile?.user.email ? (
                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                  {translateMeta("meta.email", { value: profile.user.email })}
                </p>
              ) : null}
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white/90">
                {t("membershipsTitle")}
              </h3>
              {!profile?.memberships.length ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t("membershipsEmpty")}
                </p>
              ) : (
                <ul className="space-y-2">
                  {profile.memberships.map((membership) => (
                    <MembershipAccordion
                      key={membership.id}
                      membership={membership}
                      open={openEventId === membership.id}
                      onToggle={() =>
                        setOpenEventId((current) =>
                          current === membership.id ? null : membership.id,
                        )
                      }
                      t={t}
                    />
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white/90">
                {t("timelineTitle")}
              </h3>
              {loading ? (
                <TimelineLoadingSkeleton />
              ) : error ? (
                <p className="text-sm text-error-600 dark:text-error-400">
                  {error}
                </p>
              ) : !profile?.items.length ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t("empty")}
                </p>
              ) : (
                <ol className="max-h-72 space-y-5 overflow-y-auto">
                  {profile.items.map((item, index) => {
                    const meta = formatMetadata(item.metadata, translateMeta);
                    const isLast = index === profile.items.length - 1;
                    return (
                      <li key={item.id} className="relative ps-6">
                        {!isLast ? (
                          <span
                            aria-hidden
                            className="absolute start-[4.5px] top-3 bottom-[-1.25rem] w-px bg-gray-200 dark:bg-gray-700"
                          />
                        ) : null}
                        <span
                          aria-hidden
                          className="absolute start-0 top-1.5 size-2.5 rounded-full bg-brand-500 ring-4 ring-white dark:ring-gray-900"
                        />
                        <div className="min-w-0">
                          <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                            {formatActivityTime(item.occurredAt, locale)}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-theme-xs font-medium ${actionBadgeClass(item.actionKind)}`}
                            >
                              {t(`actions.${item.actionKind}`)}
                            </span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white/90">
                              {item.description}
                            </span>
                          </div>
                          <p className="mt-0.5 text-theme-xs text-gray-500 dark:text-gray-400">
                            {item.eventName ?? t("platformOnly")} ·{" "}
                            {translateActivityModule(item.module, t)}
                          </p>
                          {meta ? (
                            <p className="mt-1 text-theme-xs text-gray-600 dark:text-gray-300">
                              {meta}
                            </p>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

function ProfileLoadingSkeleton() {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-14 w-full rounded-xl" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-28" />
        <TimelineLoadingSkeleton />
      </div>
    </div>
  );
}

function TimelineLoadingSkeleton() {
  return (
    <ul className="space-y-5" aria-hidden>
      {Array.from({ length: 3 }).map((_, index) => (
        <li key={index} className="relative ps-6">
          {index < 2 ? (
            <span className="absolute start-[4.5px] top-3 bottom-[-1.25rem] w-px bg-gray-200 dark:bg-gray-700" />
          ) : null}
          <span className="absolute start-0 top-1.5 size-2.5 rounded-full bg-gray-200 dark:bg-gray-700" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-4 w-52" />
            <Skeleton className="h-3 w-40" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function MembershipAccordion({
  membership,
  open,
  onToggle,
  t,
}: {
  membership: AdminUserEventMembership;
  open: boolean;
  onToggle: () => void;
  t: ReturnType<typeof useTranslations<"adminActivity" | "eventActivity">>;
}) {
  const permissions = membership.permissions;
  return (
    <li className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-start"
      >
        <span>
          <span className="block text-sm font-medium text-gray-900 dark:text-white/90">
            {membership.name}
          </span>
          <span className="mt-0.5 block text-theme-xs text-gray-500 dark:text-gray-400">
            {membership.isEventAdmin
              ? t("roles.event_owner")
              : (membership.roleName ?? t("roles.sub_user"))}
          </span>
        </span>
        <ChevronDownIcon
          className={`size-4 shrink-0 text-gray-500 transition ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? (
        <div className="border-t border-gray-100 px-3.5 py-3 dark:border-gray-800">
          {!permissions ? (
            <p className="text-theme-xs text-gray-500 dark:text-gray-400">
              {t("permissionsUnknown")}
            </p>
          ) : (
            <PermissionSummary permissions={permissions} t={t} />
          )}
        </div>
      ) : null}
    </li>
  );
}

function PermissionSummary({
  permissions,
  t,
}: {
  permissions: EventPermissionMatrix;
  t: ReturnType<typeof useTranslations<"adminActivity" | "eventActivity">>;
}) {
  return (
    <dl className="space-y-2">
      {MODULE_KEYS.map((key) => (
        <div
          key={key}
          className="flex items-center justify-between gap-3 text-theme-xs"
        >
          <dt className="text-gray-500 dark:text-gray-400">
            {t(`permissionModules.${key}`)}
          </dt>
          <dd className="font-medium text-gray-800 dark:text-gray-200">
            {t(`meta.levels.${permissions[key]}`)}
          </dd>
        </div>
      ))}
      {TOGGLE_KEYS.map((key) => {
        const enabled = Boolean(permissions[key]);
        return (
          <div
            key={key}
            className="flex items-center justify-between gap-3 text-theme-xs"
          >
            <dt className="text-gray-500 dark:text-gray-400">
              {t(`permissionToggles.${key}`)}
            </dt>
            <dd className="font-medium text-gray-800 dark:text-gray-200">
              {t(`meta.bool.${enabled ? "on" : "off"}`)}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
