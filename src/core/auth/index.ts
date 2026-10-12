export {
  ADMIN_ROLES,
  AUTH_STORAGE_KEY,
  EVENT_ROLES,
  IMPERSONATE_STORAGE_KEY,
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

export {
  AUTH_SESSION_COOKIE,
  parseAuthSessionCookie,
  writeAuthSessionCookie,
  type AuthSessionCookie,
} from "./cookie";

export {
  clearAuthStorage,
  emitAuthChange,
  hydrateAuthSession,
  loadAuthStorage,
  persistAuthStorage,
  readStoredUser,
  sanitizeUser,
  subscribeAuth,
  writeStoredUser,
  type AuthSnapshot,
} from "./session";

export {
  assertCanImpersonate,
  fetchImpersonationTarget,
  loginWithCredentials,
} from "./service";
