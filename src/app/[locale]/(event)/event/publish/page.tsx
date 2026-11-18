import EventPublishPanel from "@/components/event/setup/EventPublishPanel";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense>
      <EventPublishPanel />
    </Suspense>
  );
}
