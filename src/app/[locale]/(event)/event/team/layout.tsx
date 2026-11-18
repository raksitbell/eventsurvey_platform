import EventTeamWorkspaceFrame from "@/components/event/workspace/EventTeamWorkspaceFrame";
import type { ReactNode } from "react";

export default function EventTeamLayout({ children }: { children: ReactNode }) {
  return <EventTeamWorkspaceFrame>{children}</EventTeamWorkspaceFrame>;
}
