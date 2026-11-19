"use client";

import { eventInter, eventThai } from "@/components/event/setup/event-admin-fonts";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import Image from "next/image";
import styles from "./EventWorkspacePageHeader.module.css";

interface EventWorkspacePageHeaderProps {
  title: string;
  description: string;
}

export default function EventWorkspacePageHeader({
  title,
  description,
}: EventWorkspacePageHeaderProps) {
  const t = useTranslations("eventHome");

  return (
    <header className={`${styles.hero} ${eventInter.variable} ${eventThai.variable}`}>
      <div className={styles.intro}>
        <p className={styles.eyebrow}>{t("eyebrow")}</p>
        <h1>{title}</h1>
        <p className={styles.description}>{description}</p>
      </div>
      <Link href="/event" className={styles.back}>
        <Image
          src="/images/event-workspace/team-back-arrow.svg"
          alt=""
          width={18}
          height={18}
          className="rtl:rotate-180"
        />
        {t("backToOverview")}
      </Link>
    </header>
  );
}
