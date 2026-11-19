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
  canImpersonate,
  canInspectEvent,
  getHomePathForRole,
  isImpersonatableRole,
} from "./permissions";

export { clearLegacyAuthStorage, type AuthSnapshot } from "./session";

export {
  endEventInspection,
  endImpersonation,
  getAuthSnapshot,
  loginWithCredentials,
  signOut,
  startEventInspection,
  startImpersonation,
} from "./service";
