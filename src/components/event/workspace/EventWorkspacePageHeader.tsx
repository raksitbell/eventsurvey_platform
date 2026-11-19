"use client";

import { eventInter, eventThai } from "@/components/event/setup/event-admin-fonts";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import Image from "next/image";
import styles from "./EventWorkspacePageHeader.module.css";

interface EventWorkspacePageHeaderProps {
  title: string;
  description: string;
  back?: false | { label?: string; onClick: () => void; disabled?: boolean };
}

export default function EventWorkspacePageHeader({
  title,
  description,
  back,
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

  return (
    <header className={`${styles.hero} ${eventInter.variable} ${eventThai.variable}`}>
      <div className={styles.intro}>
        <p className={styles.eyebrow}>{t("eyebrow")}</p>
        <h1>{title}</h1>
        <p className={styles.description}>{description}</p>
      </div>
      {back === undefined ? (
        <Link href="/event" className={styles.back}>
          {backContent}
        </Link>
      ) : back && (
        <button
          type="button"
          onClick={back.onClick}
          disabled={back.disabled}
          className={`${styles.back} enabled:cursor-pointer disabled:opacity-55`}
        >
          {backContent}
        </button>
      )}
    </header>
  );
}
