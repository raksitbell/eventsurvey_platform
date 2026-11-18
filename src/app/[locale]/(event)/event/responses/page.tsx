import { Suspense } from "react";
import ResponsesView from "@/components/event/reports/ResponsesView";

export default function Page() {
  return (
    <Suspense>
      <ResponsesView />
    </Suspense>
  );
}
