"use client";
import useEventWorkspace from "@/hooks/useEventWorkspace";
import Image from "next/image";
import { useSidebar } from "@/context/SidebarContext";
import { Link, usePathname } from "@/i18n/navigation";
import {
  ChartBarIcon,
  ClockIcon,
  QrCodeIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";

export default function EventWorkspaceSidebar() {
  const { workspace } = useEventWorkspace();
  const published =
    !!workspace?.localPublishedAt ||
    workspace?.eventStatus === "open" ||
    workspace?.eventStatus === "closed";
  const t = useTranslations("eventSetup");
  const path = usePathname();
  const { isExpanded, isHovered, isMobileOpen, setIsHovered } = useSidebar();
  const expanded = isExpanded || isHovered || isMobileOpen;
  const items = [
    { label: t("overview"), Icon: Squares2X2Icon, href: "/event" },
    { label: t("activity"), Icon: ClockIcon, href: null },
    ...(published
      ? [
          { label: t("dashboard"), Icon: ChartBarIcon, href: null },
          { label: t("qrTitle"), Icon: QrCodeIcon, href: "/event/qr" },
        ]
      : []),
  ];
  return (
    <aside
      onMouseEnter={() => {
        if (!isExpanded) setIsHovered(true);
      }}
      onMouseLeave={() => setIsHovered(false)}
      className={`fixed inset-y-0 start-0 z-99999 flex flex-col gap-7 bg-event-sidebar px-4 py-7 text-white transition-all dark:bg-gray-950 ${expanded ? "w-70" : "w-22.5"} ${isMobileOpen ? "translate-x-0" : "-translate-x-full xl:translate-x-0 rtl:translate-x-full xl:rtl:translate-x-0"}`}
    >
      <Link
        href="/event"
        className="flex items-center gap-3"
        aria-label="EventSurvey"
      >
        <Image
          alt=""
          width={40}
          height={40}
          src="/images/event-preview/workspace-mark.png"
        />
        {expanded && (
          <span>
            <strong className="tracking-widest">EventSurvey</strong>
            <small className="block text-xs text-white/70">
              {t("appSubtitle")}
            </small>
          </span>
        )}
      </Link>
      <nav aria-label={t("overview")}>
        <h2
          className={
            expanded
              ? "mb-3 px-3 text-xs tracking-widest text-white/65"
              : "sr-only"
          }
        >
          WORKSPACE
        </h2>
        <ul className="space-y-1">
          {items.map(({ label, Icon, href }) => {
            const current =
              href === "/event" ? path !== "/event/qr" : href === path;
            const content = (
              <>
                <Icon className="size-5 shrink-0" />
                {expanded && label}
              </>
            );
            const classes = `flex w-full items-center gap-3 rounded-full px-3 py-3 text-sm ${current ? "bg-event-action" : ""}`;
            return (
              <li key={label}>
                {href ? (
                  <Link
                    className={classes}
                    href={href}
                    aria-label={label}
                    aria-current={current ? "page" : undefined}
                  >
                    {content}
                  </Link>
                ) : (
                  <button
                    disabled
                    className={classes + " opacity-65"}
                    aria-label={label}
                  >
                    {content}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
