"use client";
import { afterSaved } from "@/core/event/draft";
import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

interface EventSetupStepsProps {
  current: 1 | 2 | 3 | 4;
  onNavigate?: () => boolean | Promise<boolean>;
}
export default function EventSetupSteps({
  current,
  onNavigate,
}: EventSetupStepsProps) {
  const t = useTranslations("eventHome.details");
  const router = useRouter();
  return (
    <ol
      aria-label={t("stepsLabel")}
      className="es-setup-steps grid grid-cols-2 gap-3 lg:grid-cols-4"
    >
      {(["details", "branding", "forms", "publish"] as const).map(
        (step, index) => {
          const active = index + 1 === current;
          const href = `/event/${step}`;
          const content = (
            <>
              <span
                className={`flex size-6 shrink-0 items-center justify-center rounded-full ${active ? "bg-white text-event-action dark:bg-gray-900 dark:text-gray-200" : "bg-event-banner text-white dark:bg-brand-800"}`}
              >
                {index + 1 < current ? "✓" : index + 1}
              </span>
              {t(`steps.${step}`)}
            </>
          );
          const classes = `flex h-full items-center gap-3 rounded-xl px-3 py-3 text-portal-label ${active ? "bg-event-action text-white dark:bg-event-action" : "bg-event-tile text-event-action dark:bg-gray-800 dark:text-gray-400"}`;
          return (
            <li key={step} aria-current={active ? "step" : undefined}>
              {!active ? (
                <Link
                  href={href}
                  onNavigate={(event) => {
                    if (!onNavigate) return;
                    event.preventDefault();
                    void afterSaved(onNavigate, () => router.push(href));
                  }}
                  className={classes}
                >
                  {content}
                </Link>
              ) : (
                <span className={classes}>{content}</span>
              )}
            </li>
          );
        },
      )}
    </ol>
  );
}
