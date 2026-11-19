"use client";

import {
  clearLegacyAuthStorage,
  endEventInspection,
  getAuthSnapshot,
  getHomePathForRole,
  loginWithCredentials,
  signOut,
  startEventInspection,
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
  useRef,
  useState,
} from "react";

interface AuthContextValue {
  user: User | null;
  realUser: User | null;
  /** @deprecated Impersonation removed — always false. */
  isImpersonating: boolean;
  inspectedEventId: string | null;
  inspectedEventName: string | null;
  isInspectingEvent: boolean;
  /** True while restoring the server session or navigating after an auth change. */
  isLoading: boolean;
  authUnavailable: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  inspectEvent: (eventId: string) => Promise<void>;
  stopInspectingEvent: () => Promise<void>;
  /** @deprecated Use inspectEvent. */
  impersonate: (userId: string) => Promise<void>;
  /** @deprecated Use stopInspectingEvent. */
  stopImpersonating: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const EMPTY: AuthSnapshot = {
  realUser: null,
  impersonatedUser: null,
  inspectedEventId: null,
  inspectedEventName: null,
};

/** Safety net so a redirect that never reaches the target cannot strand the UI */
const HOLD_TIMEOUT_MS = 3000;

function normalizePath(path: string) {
  return path.replace(/\/$/, "") || "/";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [snapshot, setSnapshot] = useState<AuthSnapshot>(EMPTY);
  const [sessionStatus, setSessionStatus] = useState<
    "loading" | "ready" | "unavailable"
  >("loading");
  const authChannel = useRef<BroadcastChannel | null>(null);
  const sessionRequest = useRef<AbortController | null>(null);
  const changingSession = useRef(false);
  /** Soft-nav target — AuthGuard shows hold instead of 403 during role switches */
  const [pendingPath, setPendingPath] = useState<string | null>(null);

  useEffect(() => {
    clearLegacyAuthStorage();

    async function refreshSession() {
      if (changingSession.current) return;
      sessionRequest.current?.abort();
      const request = new AbortController();
      sessionRequest.current = request;
      try {
        const current = await getAuthSnapshot(request.signal);
        if (request.signal.aborted) return;
        setSnapshot(current);
        setSessionStatus("ready");
      } catch {
        if (request.signal.aborted) return;
        setSnapshot(EMPTY);
        setSessionStatus("unavailable");
      }
    }

    const channel =
      typeof BroadcastChannel === "function"
        ? new BroadcastChannel("eventsurvey-auth")
        : null;
    authChannel.current = channel;
    channel?.addEventListener("message", refreshSession);
    window.addEventListener("focus", refreshSession);
    void refreshSession();

    return () => {
      sessionRequest.current?.abort();
      window.removeEventListener("focus", refreshSession);
      channel?.close();
      authChannel.current = null;
    };
  }, []);

  const isHolding =
    pendingPath !== null &&
    normalizePath(pathname) !== normalizePath(pendingPath);

  useEffect(() => {
    if (!isHolding) return;
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
  const inspectedEventId = snapshot.inspectedEventId;
  const inspectedEventName = snapshot.inspectedEventName;
  const isInspectingEvent = Boolean(inspectedEventId);
  const isImpersonating = false;
  const user = realUser;

  const changeSession = useCallback(
    async (
      updateSession: () => Promise<AuthSnapshot>,
      nextPath?: string | null,
    ) => {
      if (changingSession.current) throw new Error("AUTH_CHANGE_PENDING");
      changingSession.current = true;
      sessionRequest.current?.abort();
      try {
        const next = await updateSession();
        const path =
          nextPath === undefined
            ? next.realUser
              ? next.inspectedEventId
                ? "/event"
                : getHomePathForRole(next.realUser.role)
              : "/login"
            : nextPath;
        if (path) softGo(path);
        setSnapshot(next);
        setSessionStatus("ready");
        authChannel.current?.postMessage("session-changed");
      } finally {
        changingSession.current = false;
      }
    },
    [softGo],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      await changeSession(async () => ({
        realUser: await loginWithCredentials({ email, password }),
        impersonatedUser: null,
        inspectedEventId: null,
        inspectedEventName: null,
      }));
    },
    [changeSession],
  );

  const logout = useCallback(async () => {
    await changeSession(async () => {
      await signOut();
      return EMPTY;
    });
  }, [changeSession]);

  const inspectEvent = useCallback(
    async (eventId: string) => {
      await changeSession(() => startEventInspection(eventId), "/event");
    },
    [changeSession],
  );

  const stopInspectingEvent = useCallback(async () => {
    await changeSession(endEventInspection, "/admin/events");
  }, [changeSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      realUser,
      isImpersonating,
      inspectedEventId,
      inspectedEventName,
      isInspectingEvent,
      isLoading: sessionStatus === "loading" || isHolding,
      authUnavailable: sessionStatus === "unavailable",
      login,
      logout,
      inspectEvent,
      stopInspectingEvent,
      impersonate: async () => {
        throw new Error("IMPERSONATION_REMOVED");
      },
      stopImpersonating: stopInspectingEvent,
    }),
    [
      user,
      realUser,
      isImpersonating,
      inspectedEventId,
      inspectedEventName,
      isInspectingEvent,
      sessionStatus,
      isHolding,
      login,
      logout,
      inspectEvent,
      stopInspectingEvent,
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
