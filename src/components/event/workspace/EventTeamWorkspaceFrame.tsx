import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import type { ReactNode } from "react";
import styles from "./EventTeamWorkspaceFrame.module.css";

export default async function EventTeamWorkspaceFrame({
  children,
}: {
  children: ReactNode;
}) {
  const team = await getTranslations("team");
  const view = await getTranslations("eventTeamWorkspace");

  return (
    <div className={styles.frame}>
      <header className={styles.hero}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>EVENT WORKSPACE</p>
          <h1>{team("pageTitle")}</h1>
          <p className={styles.description}>{view("description")}</p>
        </div>
        <Link href="/event" className={styles.back}>
          <Image
            src="/images/event-workspace/team-back-arrow.svg"
            alt=""
            width={18}
            height={18}
            className="rtl:rotate-180"
          />
          {view("backToOverview")}
        </Link>
      </header>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
