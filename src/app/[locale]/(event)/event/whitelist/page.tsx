import EventWhitelistPanel from "@/components/event/whitelist/EventWhitelistPanel";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense>
      <EventWhitelistPanel />
    </Suspense>
  );
}
