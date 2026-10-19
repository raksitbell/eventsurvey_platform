"use client";

import {
  assertCanImpersonate,
  getHomePathForRole,
  hydrateAuthSession,
  loginWithCredentials,
  persistAuthStorage,
  sanitizeUser,
  subscribeAuth,
  type AuthSnapshot,
} from "@/core/auth";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { User } from "@/types/user";
import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

interface AuthContextValue {
  user: User | null;
  realUser: User | null;
  isImpersonating: boolean;
  /** True until localStorage is read, or while a soft auth navigation is in flight */
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  impersonate: (target: User) => void;
  stopImpersonating: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const EMPTY: AuthSnapshot = { realUser: null, impersonatedUser: null };

/** Safety net so a redirect that never reaches the target cannot strand the UI */
const HOLD_TIMEOUT_MS = 3000;

function normalizePath(path: string) {
  return path.replace(/\/$/, "") || "/";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [snapshot, setSnapshot] = useState<AuthSnapshot>(EMPTY);
  const [ready, setReady] = useState(false);
  /** Soft-nav target — AuthGuard shows hold instead of 403 during role switches */
  const [pendingPath, setPendingPath] = useState<string | null>(null);

  useEffect(() => {
    return subscribeAuth(() => {
      // Mirror localStorage → cookie so middleware can gate /admin|/event.
      // The first notification is scheduled by the subscription after this
      // effect completes, avoiding an effect-triggered render cascade.
      setSnapshot(hydrateAuthSession());
      setReady(true);
    });
  }, []);

  /** Arrival is derived, not stored — reaching the target ends the hold on its
   *  own, so nothing has to clear pendingPath synchronously inside an effect. */
  const isHolding =
    pendingPath !== null &&
    normalizePath(pathname) !== normalizePath(pendingPath);

  useEffect(() => {
    if (!isHolding) return;
    // A guard may redirect somewhere other than the target mid-flight. Without
    // this the hold never ends and every guarded page sits on "…" until a hard
    // refresh.
    const timer = setTimeout(() => setPendingPath(null), HOLD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [isHolding, pathname]);

  const softGo = useCallback(
    (path: string) => {
      if (normalizePath(pathname) === normalizePath(path)) {
        setPendingPath(null);
        return;
      }
      setPendingPath(path);
      router.replace(path);
    },
    [pathname, router],
  );

  const realUser = snapshot.realUser;
  const impersonatedUser = snapshot.impersonatedUser;
  const isImpersonating = Boolean(impersonatedUser);
  const user = impersonatedUser ?? realUser;

  const login = useCallback(
    async (email: string, password: string) => {
      const safeUser = await loginWithCredentials({ email, password });
      persistAuthStorage(safeUser, null);
      softGo(getHomePathForRole(safeUser.role));
      return safeUser;
    },
    [softGo],
  );

  const logout = useCallback(() => {
    persistAuthStorage(null, null);
    softGo("/login");
  }, [softGo]);

  const impersonate = useCallback(
    (target: User) => {
      if (!realUser) throw new Error("FORBIDDEN");
      assertCanImpersonate(realUser, target);
      // Hold first so /admin doesn't paint 403 after role flip
      setPendingPath(getHomePathForRole(target.role));
      persistAuthStorage(realUser, sanitizeUser(target));
      router.replace(getHomePathForRole(target.role));
    },
    [realUser, router],
  );

  const stopImpersonating = useCallback(() => {
    if (!realUser) return;
    const home = getHomePathForRole(realUser.role);
    setPendingPath(home);
    persistAuthStorage(realUser, null);
    router.replace(home);
  }, [realUser, router]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      realUser,
      isImpersonating,
      isLoading: !ready || isHolding,
      login,
      logout,
      impersonate,
      stopImpersonating,
    }),
    [
      user,
      realUser,
      isImpersonating,
      ready,
      isHolding,
      login,
      logout,
      impersonate,
      stopImpersonating,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
