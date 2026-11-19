export {
  ADMIN_ROLES,
  EVENT_ROLES,
  PORTAL_ROLES,
} from "./constants";

export {
  canAccessAdmin,
  canAccessEvent,
  canAccessPortal,
  canEnterAdminArea,
  canEnterEventArea,
  canInspectEvent,
  getHomePathForRole,
  isImpersonatableRole,
} from "./permissions";

export { clearLegacyAuthStorage, type AuthSnapshot } from "./session";

export {
  endEventInspection,
  getAuthSnapshot,
  loginWithCredentials,
  signOut,
  startEventInspection,
} from "./service";
