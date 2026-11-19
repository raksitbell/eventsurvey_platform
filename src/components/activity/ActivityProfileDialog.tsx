"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useRef, type KeyboardEvent } from "react";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { getActivitySummary } from "@/services/activity/mock";
import type {
  ActivityActor,
  ActivityEvent,
  ActivityRecord,
  ActivityScope,
} from "@/types/activity";

interface ActivityProfileDialogProps {
  scope: ActivityScope;
  actor: ActivityActor;
  records: readonly ActivityRecord[];
  events: readonly ActivityEvent[];
  onClose: () => void;
}

const markerPath = "/images/user-activity/timeline-marker.svg";
const closeIconPath = "/images/user-activity/close.svg";
const timeZone = "Asia/Bangkok";

export default function ActivityProfileDialog({
  scope,
  actor,
  records,
  events,
  onClose,
}: ActivityProfileDialogProps) {
  const t = useTranslations("userActivity");
  const locale = useLocale();
  const actorName = locale === "th" ? (actor.nameTh ?? actor.name) : actor.name;
  const titleId = useId();
  const timelineId = useId();
  const closeButton = useRef<HTMLButtonElement>(null);
  const isPlatform = scope === "platform";
  const activity = records
    .filter((record) => record.actorUserId === actor.id)
    .sort(
      (first, second) =>
        Date.parse(second.occurredAt) - Date.parse(first.occurredAt),
    );
  const counts = getActivitySummary(activity);
  const statistics = [
    { key: "total", label: t("metrics.total") },
    { key: "edit", label: t("actions.edit") },
    { key: "add", label: t("actions.add") },
    { key: "delete", label: t("actions.delete") },
  ] as const;

  const formatDate = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeZone,
  });
  const formatTime = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
  });
  const formatShortDate = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    timeZone,
  });
  const formatNumber = new Intl.NumberFormat(locale);
  const formatValue = (value: string | number) => {
    if (typeof value === "number") return formatNumber.format(value);
    return /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? formatShortDate.format(new Date(value))
      : value;
  };

  useEffect(() => {
    const openButton = document.activeElement;
    closeButton.current?.focus();
    return () => {
      if (openButton instanceof HTMLElement && openButton.isConnected) {
        openButton.focus();
      }
    };
  }, []);

  function keepFocusInDialog(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab") return;

    const controls = event.currentTarget.querySelectorAll<HTMLElement>(
      "button, [tabindex='0']",
    );
    const first = controls[0];
    const last = controls[controls.length - 1];

    if (event.shiftKey && event.target === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && event.target === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      showCloseButton={false}
      labelledBy={titleId}
      className="max-w-164 overflow-hidden rounded-[20px] border border-t-8 border-event-border border-t-event-action p-0 dark:border-gray-700 dark:border-t-event-action"
    >
      <div
        className="flex max-h-[min(47rem,calc(100dvh-2.5rem))] flex-col px-4 sm:px-8"
        onKeyDown={keepFocusInDialog}
      >
        <div className="min-h-0 overflow-y-auto overscroll-contain pt-4 sm:pt-5">
          <header className="flex items-start justify-between gap-3">
            <div>
              <h2
                id={titleId}
                className="text-xl font-bold text-event-display-text dark:text-gray-100"
              >
                {t("profile.title")}
              </h2>
              <p className="mt-1 text-xs text-event-display-muted dark:text-gray-300">
                {t(
                  isPlatform
                    ? "profile.platformDescription"
                    : "profile.eventDescription",
                )}
              </p>
            </div>
            <button
              ref={closeButton}
              type="button"
              aria-label={t("profile.close")}
              onClick={onClose}
              className="grid size-9.5 shrink-0 place-items-center rounded-[10px] bg-event-subtle transition hover:bg-event-tile focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-event-action dark:bg-event-tile dark:hover:bg-event-display-banner"
            >
              <Image src={closeIconPath} width={20} height={20} alt="" />
            </button>
          </header>

          <div className="mt-6 flex items-center gap-4">
            <div
              aria-hidden="true"
              className="grid size-16 shrink-0 place-items-center rounded-full bg-event-action text-xl font-bold text-white dark:bg-event-action"
            >
              {actorName
                .split(/\s+/)
                .slice(0, 2)
                .map((part) => Array.from(part)[0])
                .join("")
                .toLocaleUpperCase(locale)}
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold wrap-anywhere text-event-display-text dark:text-gray-100">
                {actorName}
              </p>
              <p className="mt-1 inline-block rounded-full bg-event-tile px-4 py-1 text-xs font-semibold text-event-sidebar dark:bg-event-action/25 dark:text-event-tile">
                {t(`roles.${actor.role}`)}
              </p>
            </div>
          </div>

          <p className="mt-4 rounded-xl bg-event-subtle px-4 py-3 text-sm font-semibold text-event-sidebar dark:bg-gray-800 dark:text-event-tile">
            {isPlatform
              ? t("profile.relatedEvents", { count: counts.eventCount })
              : events[0]?.name}
          </p>

          <dl className="my-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {statistics.map(({ key, label }) => (
              <div
                key={key}
                className="flex flex-col-reverse rounded-xl bg-event-subtle px-3 py-2 dark:bg-gray-800"
              >
                <dt className="text-xs text-event-display-muted dark:text-gray-300">
                  {label}
                </dt>
                <dd className="text-[22px] leading-7 font-bold text-event-sidebar dark:text-event-tile">
                  {formatNumber.format(counts[key])}
                </dd>
              </div>
            ))}
          </dl>

          <section
            aria-labelledby={timelineId}
            className="border-t border-event-border pt-4 dark:border-gray-700"
          >
            <h3
              id={timelineId}
              className="text-lg font-semibold text-event-display-text dark:text-gray-100"
            >
              {t("profile.timeline")}
            </h3>
            {activity.length === 0 ? (
              <p className="py-6 text-sm text-event-display-muted dark:text-gray-300">
                {t("profile.empty")}
              </p>
            ) : (
              <ol
                tabIndex={0}
                aria-labelledby={timelineId}
                className="my-4 rounded-md pt-1 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-event-action sm:max-h-76 sm:overflow-y-auto sm:overscroll-contain sm:ps-8"
              >
                {activity.map((record) => {
                  const occurredAt = new Date(record.occurredAt);
                  const eventName = isPlatform
                    ? events.find((event) => event.id === record.eventId)?.name
                    : undefined;

                  return (
                    <li
                      key={record.id}
                      className="relative flex min-h-24 items-start gap-3 pb-4"
                    >
                      <span
                        aria-hidden="true"
                        className="absolute start-[13px] top-3.5 bottom-0 w-0.5 bg-event-tile dark:bg-event-action/40"
                      />
                      <Image
                        src={markerPath}
                        width={28}
                        height={28}
                        alt=""
                        className="relative shrink-0"
                      />
                      <div className="min-w-0 pe-3">
                        <time
                          dateTime={record.occurredAt}
                          className="block text-xs text-event-display-muted dark:text-gray-300"
                        >
                          {formatDate.format(occurredAt)} ·{" "}
                          {formatTime.format(occurredAt)}
                          {locale === "th" ? " น." : ""} (ICT)
                        </time>
                        <p className="mt-1 text-sm font-semibold text-event-display-text dark:text-gray-100">
                          {eventName ? `${eventName} · ` : ""}
                          {t(`actions.${record.actionType}`)} ·{" "}
                          {t(`entities.${record.entityType}`)}
                        </p>
                        {record.changedFields.length > 0 && (
                          <ul className="mt-1 space-y-1 text-xs text-event-display-muted dark:text-gray-300">
                            {record.changedFields.map((field) => {
                              const change = record.syntheticDiffs?.[field];

                              return (
                                <li key={field}>
                                  {t(`fields.${field}`)}
                                  {change
                                    ? `: ${formatValue(change.previous)} → ${formatValue(change.current)}`
                                    : ""}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </div>

        <footer className="flex shrink-0 justify-end border-t border-event-border pt-2.5 pb-4 dark:border-gray-700">
          <Button
            onClick={onClose}
            className="min-h-11 min-w-30 rounded-xl! bg-event-action! py-2! text-sm! shadow-none! hover:bg-event-sidebar! focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-event-action dark:bg-event-action! dark:hover:bg-event-action/85!"
          >
            {t("profile.close")}
          </Button>
        </footer>
      </div>
    </Modal>
  );
}
