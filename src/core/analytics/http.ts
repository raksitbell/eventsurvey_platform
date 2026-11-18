import { AnalyticsError } from "@/core/analytics/policy";
import { authJson } from "@/core/auth/route-response";

export function analyticsFailure(error: unknown) {
  return error instanceof AnalyticsError
    ? authJson({ error: error.message }, error.status)
    : authJson({ error: "ANALYTICS_UNAVAILABLE" }, 502);
}
