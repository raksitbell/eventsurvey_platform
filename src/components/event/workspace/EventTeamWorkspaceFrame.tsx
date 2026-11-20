import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import styles from "./EventTeamWorkspaceFrame.module.css";
import EventWorkspacePageHeader from "./EventWorkspacePageHeader";

export default async function EventTeamWorkspaceFrame({
  children,
}: {
  children: ReactNode;
}) {
  const team = await getTranslations("team");
  const view = await getTranslations("eventTeamWorkspace");

  return (
    <div className={styles.frame}>
      <EventWorkspacePageHeader
        title={team("pageTitle")}
        description={view("description")}
      />
      {children}
    </div>
  );
}
