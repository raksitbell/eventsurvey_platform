import EventBrandingForm from "@/components/event/setup/EventBrandingForm";
import { Suspense } from "react";

export default function EventBrandingPage() {
  return (
    <Suspense>
      <EventBrandingForm />
    </Suspense>
  );
}
