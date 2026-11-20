"use client";

import { eventInter, eventThai } from "@/components/event/setup/event-admin-fonts";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import Image from "next/image";
import type { ReactNode } from "react";
import styles from "./EventWorkspacePageHeader.module.css";

interface EventWorkspacePageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  back?: false | { label: string; href: string } | { label?: string; onClick: () => void; disabled?: boolean };
  action?: ReactNode;
}

export default function EventWorkspacePageHeader({
  title,
  description,
  eyebrow,
  back,
  action,
}: EventWorkspacePageHeaderProps) {
  const t = useTranslations("eventHome");
  const backContent = (
    <>
      <Image
        src="/images/event-workspace/team-back-arrow.svg"
        alt=""
        width={18}
        height={18}
        className="rtl:rotate-180"
      />
      {back && back.label ? back.label : t("backToOverview")}
    </>
  );
  const backAction = back === undefined || (back && "href" in back) ? (
    <Link href={back?.href ?? "/event"} className={styles.back}>{backContent}</Link>
  ) : back && (
    <button
      type="button"
      onClick={back.onClick}
      disabled={back.disabled}
      className={`${styles.back} enabled:cursor-pointer disabled:opacity-55`}
    >
      {backContent}
    </button>
  );

  return (
    <header className={`${styles.hero} ${eventInter.variable} ${eventThai.variable}`}>
      <div className={styles.intro}>
        <p className={styles.eyebrow}>{eyebrow ?? t("eyebrow")}</p>
        <h1>{title}</h1>
        {description && <p className={styles.description}>{description}</p>}
      </div>
      {action ? <div className={styles.actions}>{backAction}{action}</div> : backAction}
    </header>
  );
}
