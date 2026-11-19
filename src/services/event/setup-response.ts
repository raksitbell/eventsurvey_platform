import { authJson } from "@/core/auth/route-response";
import { ServiceError } from "@/core/api/service-error";

export function setupErrorResponse(error: unknown) {
  if (error instanceof ServiceError) {
    return authJson({ error: error.code, issues: error.details }, error.status);
  }
  return authJson({ error: "SETUP_STORAGE_UNAVAILABLE" }, 503);
}
