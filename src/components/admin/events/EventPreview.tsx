"use client";

import EventStatusBadge from "@/components/admin/events/EventStatusBadge";
import UserAccountStatusBadge from "@/components/admin/events/UserAccountStatusBadge";
import SelectField from "@/components/form/SelectField";
import Button from "@/components/ui/button/Button";
import Skeleton from "@/components/ui/skeleton/Skeleton";
import { api } from "@/core/api";
import {
  ChevronLeftIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { AdminEventDetail } from "@/types/admin/events";
import type { MockAccountStatus } from "@/types/mock";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

type TabId = "details" | "users";

const ACCOUNT_STATUSES: MockAccountStatus[] = [
  "invited",
  "active",
  "suspended",
  "removed",
];

function parseTab(value: string | null): TabId {
  return value === "users" ? "users" : "details";
}

function translateEventRoleName(
  roleName: string | null,
  t: (key: string) => string,
): string {
  if (!roleName) return "—";
  if (roleName === "Event Admin") return t("roleNames.eventAdmin");
  return roleName;
}

function formatDateTime(value: string | null, locale: string): string {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

type EventPreviewProps = {
  eventId: string;
};

export default function EventPreview({ eventId }: EventPreviewProps) {
  const t = useTranslations("adminEvents");
  const tAccountStatus = useTranslations("common.accountStatus");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tab = parseTab(searchParams.get("tab"));
  const setTab = useCallback(
    (next: TabId) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", next);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router, searchParams],
  );

  const [event, setEvent] = useState<AdminEventDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userQuery, setUserQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [contentLocale, setContentLocale] = useState<string | null>(null);
  const [brokenBanners, setBrokenBanners] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      setError(null);
      setBrokenBanners(new Set());
      try {
        const data = await api.get<AdminEventDetail>(
          `/admin/events/${encodeURIComponent(eventId)}?locale=${encodeURIComponent(locale)}`,
        );
        if (!cancelled) {
          setEvent(data);
          setContentLocale(
            data.translations.find((row) => row.locale === data.defaultLocale)
              ?.locale ??
              data.translations[0]?.locale ??
              null,
          );
        }
      } catch {
        if (!cancelled) setError(t("loadError"));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [eventId, locale, t]);

  const filteredUsers = useMemo(() => {
    if (!event) return [];
    const q = userQuery.trim().toLowerCase();
    return event.users.filter((user) => {
      if (statusFilter !== "all" && user.status !== statusFilter) return false;
      if (!q) return true;
      return (
        user.name.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q) ||
        (user.roleName?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [event, statusFilter, userQuery]);

  const activeTranslation =
    event?.translations.find((row) => row.locale === contentLocale) ?? null;

  const visibleBanners = useMemo(() => {
    if (!event) return [];
    return event.bannerUrls.filter((url) => !brokenBanners.has(url));
  }, [brokenBanners, event]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="text-sm text-gray-500 dark:text-gray-400">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link
                href="/admin/events"
                className="hover:text-brand-500 dark:hover:text-brand-400"
              >
                {t("title")}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="font-medium text-gray-800 dark:text-white/90">
              {t("view")}
            </li>
          </ol>
        </nav>
        <div className="flex flex-wrap items-center gap-2">
          {event?.status === "draft" ? (
            <Link href={`/admin/events/${eventId}/edit`}>
              <Button
                size="sm"
                startIcon={<PencilSquareIcon className="size-4" />}
              >
                {t("edit")}
              </Button>
            </Link>
          ) : null}
          <Link href="/admin/events">
            <Button
              size="sm"
              variant="outline"
              startIcon={
                <ChevronLeftIcon className="size-5 rtl:rotate-180" />
              }
            >
              {t("preview.back")}
            </Button>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <EventPreviewSkeleton />
      ) : error || !event ? (
        <p className="text-sm text-error-600 dark:text-error-400">
          {error ?? t("loadError")}
        </p>
      ) : (
        <>
          <div className="flex gap-1 border-b border-gray-200 dark:border-gray-800">
            {(
              [
                ["details", t("preview.tabDetails")],
                ["users", t("preview.tabUsers", { count: event.users.length })],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition ${
                  tab === id
                    ? "border-brand-500 text-brand-600 dark:text-brand-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "details" ? (
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
                <SectionCard title={t("preview.eventInfo")}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <DetailField label={t("columns.slug")} value={event.slug} />
                    <DetailField
                      label={t("columns.admin")}
                      value={
                        event.adminName
                          ? `${event.adminName}${event.adminEmail ? ` (${event.adminEmail})` : ""}`
                          : "—"
                      }
                    />
                    <DetailField
                      label={t("preview.defaultLocale")}
                      value={event.defaultLocale.toUpperCase()}
                    />
                    <DetailField
                      label={t("preview.accessMode")}
                      value={
                        event.isPrivate
                          ? t("preview.privateEvent")
                          : t("preview.publicEvent")
                      }
                    />
                    <DetailField
                      label={t("preview.flows")}
                      value={[
                        event.hasRegistration ? t("preview.hasRegistration") : null,
                        event.hasSurvey ? t("preview.hasSurvey") : null,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    />
                    <DetailField
                      label={t("preview.memberCount")}
                      value={String(event.users.length)}
                    />
                  </div>

                  <div className="mt-5 border-t border-gray-100 pt-5 dark:border-gray-800">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                        {t("preview.contentByLocale")}
                      </h3>
                      {event.translations.length > 0 ? (
                        <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
                          {event.translations.map((row) => (
                            <button
                              key={row.locale}
                              type="button"
                              onClick={() => setContentLocale(row.locale)}
                              className={`rounded-md px-3 py-1.5 text-theme-xs font-medium transition ${
                                contentLocale === row.locale
                                  ? "bg-white text-gray-900 shadow-theme-xs dark:bg-gray-700 dark:text-white"
                                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                              }`}
                            >
                              {row.locale.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    {!activeTranslation ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t("preview.noTranslations")}
                      </p>
                    ) : (
                      <div className="space-y-4">
                        <DetailField
                          label={t("columns.title")}
                          value={activeTranslation.title}
                        />
                        <DetailField
                          label={t("preview.description")}
                          value={activeTranslation.description ?? "—"}
                        />
                        <div className="grid gap-4 sm:grid-cols-2">
                          <DetailField
                            label={t("preview.venue")}
                            value={activeTranslation.locationName ?? "—"}
                          />
                          <DetailField
                            label={t("preview.address")}
                            value={activeTranslation.addressText ?? "—"}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </SectionCard>

                <SectionCard
                  title={t("preview.bannerGallery")}
                  action={
                    event.bannerUrls.length > 0 ? (
                      <span className="text-theme-xs text-gray-500 dark:text-gray-400">
                        {t("preview.bannerCount", {
                          count: event.bannerUrls.length,
                        })}
                      </span>
                    ) : null
                  }
                >
                  {visibleBanners.length === 0 ? (
                    <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-400 dark:border-gray-700 dark:bg-white/5 dark:text-gray-500">
                      {t("preview.noBanner")}
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {visibleBanners.map((url, index) => (
                        <div
                          key={url}
                          className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/5"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt={`${event.title} banner ${index + 1}`}
                            className="aspect-[3/4] w-full object-cover"
                            onError={() =>
                              setBrokenBanners((prev) => {
                                const next = new Set(prev);
                                next.add(url);
                                return next;
                              })
                            }
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </SectionCard>
              </div>

              <aside className="lg:col-span-1">
                <div className="sticky top-24 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-4 dark:border-gray-800">
                    <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
                      {t("preview.statusCard")}
                    </h2>
                    <EventStatusBadge status={event.status} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    <DetailField
                      label={t("startDate")}
                      value={formatDateTime(event.startsAt, locale)}
                    />
                    <DetailField
                      label={t("endDate")}
                      value={formatDateTime(event.endsAt, locale)}
                    />
                    <DetailField
                      label={t("preview.createdAt")}
                      value={formatDateTime(event.createdAt, locale)}
                    />
                    <DetailField
                      label={t("columns.updatedAt")}
                      value={formatDateTime(event.updatedAt, locale)}
                    />
                    <DetailField
                      label={t("preview.opensAt")}
                      value={formatDateTime(event.opensAt, locale)}
                    />
                    <DetailField
                      label={t("preview.closesAt")}
                      value={formatDateTime(event.closesAt, locale)}
                    />
                  </div>
                </div>
              </aside>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-theme-xs text-gray-500 dark:text-gray-400">
                    {t("preview.userSearch")}
                  </label>
                  <input
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                    placeholder={t("preview.userSearchPlaceholder")}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-theme-xs text-gray-500 dark:text-gray-400">
                    {t("columns.status")}
                  </label>
                  <SelectField
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">{t("preview.allUserStatuses")}</option>
                    {ACCOUNT_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {tAccountStatus(status)}
                      </option>
                    ))}
                  </SelectField>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                    <thead className="bg-gray-50 dark:bg-white/5">
                      <tr>
                        <th className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                          {t("preview.userName")}
                        </th>
                        <th className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                          {t("preview.userEmail")}
                        </th>
                        <th className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                          {t("preview.userRole")}
                        </th>
                        <th className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                          {t("columns.status")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                          >
                            {t("preview.usersEmpty")}
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((user) => (
                          <tr key={user.id}>
                            <td className="px-4 py-3 text-sm text-gray-800 dark:text-white/90">
                              {user.name}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                              {user.email}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                              {translateEventRoleName(user.roleName, t)}
                            </td>
                            <td className="px-4 py-3">
                              <UserAccountStatusBadge status={user.status} />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EventPreviewSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="flex gap-2">
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
            <Skeleton className="mb-4 h-5 w-40" />
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-5 w-full max-w-48" />
                </div>
              ))}
            </div>
            <div className="mt-5 space-y-3 border-t border-gray-100 pt-5 dark:border-gray-800">
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
            <Skeleton className="mb-4 h-5 w-36" />
            <div className="grid gap-3 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[3/4] w-full rounded-xl" />
              ))}
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
          <div className="mb-5 flex items-center justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-28" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-theme-xs font-medium text-gray-500 dark:text-gray-400">
        {label}
      </dt>
      <dd className="mt-1 whitespace-pre-wrap text-sm text-gray-800 dark:text-white/90">
        {value}
      </dd>
    </div>
  );
}
