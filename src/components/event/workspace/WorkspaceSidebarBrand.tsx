import Image from "next/image";
import { useTranslations } from "next-intl";
import type { ComponentProps } from "react";
import { Link } from "@/i18n/navigation";
import styles from "./EventWorkspaceChrome.module.css";

interface WorkspaceSidebarBrandProps {
  href: string;
  expanded: boolean;
  onNavigate?: ComponentProps<typeof Link>["onNavigate"];
}

export default function WorkspaceSidebarBrand({
  href,
  expanded,
  onNavigate,
}: WorkspaceSidebarBrandProps) {
  const t = useTranslations("eventSetup");

  return (
    <Link
      href={href}
      onNavigate={onNavigate}
      className={styles.brand}
      aria-label="EventSurvey"
    >
      <span className={styles.mark}>
        <Image
          alt=""
          width={27}
          height={26}
          src="/images/event-workspace/ticket-speech-symbol.svg"
        />
      </span>
      {expanded && (
        <span className={styles.wordmark}>
          <strong>EventSurvey</strong>
          <small>{t("appSubtitle")}</small>
        </span>
      )}
    </Link>
  );
}
