"use client";

import Table, {
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table/Table";
import { Link } from "@/i18n/navigation";
import type {
  ActivityActor,
  ActivityData,
  ActivityRecord,
  ActivityRelatedPage,
  ActivityScope,
} from "@/types/activity";
import {
  ArrowUpRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { useFormatter, useLocale, useTranslations } from "next-intl";

const cell = "px-3 py-2 align-top text-start first:ps-4 last:pe-4";
const rowLink =
  "inline-flex items-center gap-1 rounded-sm font-semibold text-event-sidebar hover:underline focus-visible:outline-2 focus-visible:outline-event-action dark:text-purple-300";
const paginationButton =
  "inline-flex min-h-8 min-w-8 items-center justify-center gap-1 rounded-md px-1.5 hover:bg-event-tile focus-visible:outline-2 focus-visible:outline-event-action disabled:opacity-40 dark:hover:bg-gray-700";

interface ActivityTableProps {
  scope: ActivityScope;
  data: ActivityData;
  rows: readonly ActivityRecord[];
  total: number;
  page: number;
  pageSize: number;
  onPage: (page: number) => void;
  onEvent: (eventId: string) => void;
  onProfile: (actor: ActivityActor) => void;
  relatedHref: (page: ActivityRelatedPage) => string | undefined;
}

export default function ActivityTable({
  scope,
  data,
  rows,
  total,
  page,
  pageSize,
  onPage,
  onEvent,
  onProfile,
  relatedHref,
}: ActivityTableProps) {
  const t = useTranslations("userActivity");
  const locale = useLocale();
  const format = useFormatter();
  const timeZone = "Asia/Bangkok";
  const dateFormat = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone,
  });
  const timeFormat = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
  });
  const platform = scope === "platform";
  const columns = [
    "when",
    "actor",
    "action",
    ...(platform ? ["event"] : []),
    "entity",
    "related",
    "profile",
  ];
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const firstPage = Math.max(1, Math.min(page - 1, pages - 2));
  const pager = Array.from(
    { length: Math.min(3, pages) },
    (_, index) => firstPage + index,
  );
  const actors = new Map(data.actors.map((actor) => [actor.id, actor]));
  const events = new Map(data.events.map((event) => [event.id, event]));

  return (
    <div className="overflow-hidden rounded-xl border border-preview-border bg-white dark:border-gray-700 dark:bg-gray-900">
      <div
        className="overflow-x-auto focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-event-action"
        role="region"
        aria-label={t("tableLabel")}
        tabIndex={0}
      >
        <Table className={platform ? "min-w-[880px]" : "min-w-[740px]"}>
          <TableHeader className="bg-event-subtle text-xs text-participant-muted dark:bg-gray-800 dark:text-gray-300">
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column}
                  isHeader
                  className={`${cell} h-10 min-w-24 align-middle font-semibold`}
                >
                  {t(`columns.${column}`)}
                </TableCell>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-event-border text-xs text-participant-text dark:divide-gray-700 dark:text-gray-200">
            {rows.map((row) => {
              const actor = actors.get(row.actorUserId);
              const actorName =
                locale === "th" ? (actor?.nameTh ?? actor?.name) : actor?.name;
              const event = events.get(row.eventId);
              const href = relatedHref(row.relatedPage);
              const date = new Date(row.occurredAt);
              return (
                <TableRow key={row.id} className="h-14">
                  <TableCell
                    className={`${cell} w-[12%] whitespace-nowrap text-participant-muted dark:text-gray-400`}
                  >
                    <time dateTime={row.occurredAt}>
                      <span className="block">{dateFormat.format(date)}</span>
                      <span className="block">
                        {t("time", { time: timeFormat.format(date) })}
                      </span>
                    </time>
                  </TableCell>
                  <TableCell
                    className={`${cell} w-[14%] min-w-28 text-preview-control font-semibold`}
                  >
                    {actorName ?? "—"}
                  </TableCell>
                  <TableCell className={`${cell} w-[10%]`}>
                    <span className="inline-flex min-h-7 min-w-20 items-center rounded-full bg-event-tile px-2.5 font-semibold text-event-sidebar dark:bg-gray-800 dark:text-purple-300">
                      {t(`actions.${row.actionType}`)}
                    </span>
                  </TableCell>
                  {platform && (
                    <TableCell className={`${cell} w-[18%]`}>
                      {event ? (
                        <button
                          type="button"
                          onClick={() => onEvent(event.id)}
                          className={`${rowLink} text-start`}
                        >
                          {event.name}
                        </button>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  )}
                  <TableCell className={`${cell} w-[16%] font-medium`}>
                    {t(`entities.${row.entityType}`)}
                  </TableCell>
                  <TableCell className={`${cell} text-preview-control`}>
                    {href ? (
                      <Link href={href} className={rowLink}>
                        {t(`pages.${row.relatedPage}`)}
                        <ArrowUpRightIcon
                          className="size-3 shrink-0 rtl:-scale-x-100"
                          aria-hidden="true"
                        />
                      </Link>
                    ) : (
                      <span className="text-participant-muted dark:text-gray-400">
                        {t(`pages.${row.relatedPage}`)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className={`${cell} w-[11%] whitespace-nowrap`}>
                    {actor ? (
                      <button
                        type="button"
                        className={rowLink}
                        onClick={() => onProfile(actor)}
                        aria-label={t("profile.openFor", {
                          name: actorName ?? actor.name,
                        })}
                      >
                        {t("profile.open")}
                        <ChevronRightIcon
                          className="size-3 shrink-0 rtl:rotate-180"
                          aria-hidden="true"
                        />
                      </button>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="p-8 text-center text-sm text-participant-muted dark:text-gray-300"
                >
                  {t("empty")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex min-h-10 flex-wrap items-center justify-between gap-x-3 gap-y-1 bg-event-subtle px-4 py-1 text-xs text-participant-muted dark:bg-gray-800 dark:text-gray-300">
        <p aria-live="polite">
          {t("resultCount", { shown: rows.length, total })}
        </p>
        {total > 0 && (
          <nav
            aria-label={t("pagination.label")}
            className="flex flex-wrap items-center gap-0.5 text-participant-text dark:text-gray-200"
          >
            <button
              type="button"
              className={paginationButton}
              disabled={page === 1}
              onClick={() => onPage(page - 1)}
            >
              <ChevronLeftIcon
                className="size-3 rtl:rotate-180"
                aria-hidden="true"
              />
              {t("pagination.previous")}
            </button>
            {pager.map((number) => (
              <button
                type="button"
                key={number}
                className={`${paginationButton} aria-[current=page]:bg-event-tile aria-[current=page]:font-semibold dark:aria-[current=page]:bg-gray-700`}
                aria-label={t("pagination.page", { number })}
                aria-current={number === page ? "page" : undefined}
                onClick={() => onPage(number)}
              >
                {format.number(number)}
              </button>
            ))}
            <button
              type="button"
              className={paginationButton}
              disabled={page === pages}
              onClick={() => onPage(page + 1)}
            >
              {t("pagination.next")}
              <ChevronRightIcon
                className="size-3 rtl:rotate-180"
                aria-hidden="true"
              />
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}
