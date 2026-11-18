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
  getHomePathForRole,
  isImpersonatableRole,
} from "./permissions";

export { clearLegacyAuthStorage, type AuthSnapshot } from "./session";

export {
  getAuthSnapshot,
  loginWithCredentials,
  signOut,
  startImpersonation,
  endImpersonation,
} from "./service";
