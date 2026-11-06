import { Suspense } from "react";
import AnalyticsWorkspace from "@/components/analytics/AnalyticsWorkspace";
export default function Page() {
  return (
    <Suspense>
      <AnalyticsWorkspace view="builder" />
    </Suspense>
  );
}
