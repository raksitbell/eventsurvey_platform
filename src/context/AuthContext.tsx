"use client";

import {
  assertCanImpersonate,
  clearAuthStorage,
  getHomePathForRole,
  loadAuthStorage,
  loginWithCredentials,
  persistAuthStorage,
  sanitizeUser,
} from "@/core/auth";
import { useRouter } from "@/i18n/navigation";
import type { AuthSession } from "@/types/auth";
import type { User } from "@/types/user";
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
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  impersonate: (target: User) => void;
  stopImpersonating: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [realUser, setRealUser] = useState<User | null>(null);
  const [impersonatedUser, setImpersonatedUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = loadAuthStorage();
    setRealUser(stored.realUser);
    setImpersonatedUser(stored.impersonatedUser);
    setIsLoading(false);
  }, []);

  const persistSession = useCallback((session: AuthSession) => {
    setRealUser(session.user);
    setImpersonatedUser(session.impersonatedUser);
    persistAuthStorage(session.user, session.impersonatedUser);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const safeUser = await loginWithCredentials({ email, password });
      persistSession({ user: safeUser, impersonatedUser: null });
      router.replace(getHomePathForRole(safeUser.role));
      return safeUser;
    },
    [persistSession, router],
  );

  const logout = useCallback(() => {
    setRealUser(null);
    setImpersonatedUser(null);
    clearAuthStorage();
    router.replace("/login");
  }, [router]);

  const impersonate = useCallback(
    (target: User) => {
      if (!realUser) throw new Error("FORBIDDEN");
      assertCanImpersonate(realUser, target);
      const safeTarget = sanitizeUser(target);
      persistSession({ user: realUser, impersonatedUser: safeTarget });
      router.replace(getHomePathForRole(safeTarget.role));
    },
    [persistSession, realUser, router],
  );

  const stopImpersonating = useCallback(() => {
    if (!realUser) return;
    persistSession({ user: realUser, impersonatedUser: null });
    router.replace(getHomePathForRole(realUser.role));
  }, [persistSession, realUser, router]);

  const value = useMemo<AuthContextValue>(() => {
    const effectiveUser = impersonatedUser ?? realUser;
    return {
      user: effectiveUser,
      realUser,
      isImpersonating: Boolean(impersonatedUser),
      isLoading,
      login,
      logout,
      impersonate,
      stopImpersonating,
    };
  }, [
    impersonatedUser,
    realUser,
    isLoading,
    login,
    logout,
    impersonate,
    stopImpersonating,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
