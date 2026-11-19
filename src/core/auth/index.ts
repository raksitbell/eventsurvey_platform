export {
  ADMIN_ROLES,
  EVENT_ROLES,
  MOCK_DEMO_PASSWORD,
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
  getAdminHomePath,
  getHomePathForRole,
  isImpersonatableRole,
  type PlatformNavAccess,
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
