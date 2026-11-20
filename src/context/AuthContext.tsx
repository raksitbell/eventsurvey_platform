"use client";

import {
  canEnterAdminArea,
  canEnterEventArea,
  clearLegacyAuthStorage,
  endEventInspection,
  getAuthSnapshot,
  getHomePathForRole,
  loginWithCredentials,
  signOut,
  startEventInspection,
  type AuthSnapshot,
} from "@/core/auth";
import { EMPTY_AUTH_SNAPSHOT } from "@/core/auth/session";
import { usePathname, useRouter } from "@/i18n/navigation";
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

interface AuthContextValue extends AuthSnapshot {
  allowAdmin: boolean;
  allowEvent: boolean;
  isInspectingEvent: boolean;
  /** True while restoring the server session or navigating after an auth change. */
  isLoading: boolean;
  authUnavailable: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  inspectEvent: (eventId: string, path?: string) => Promise<void>;
  stopInspectingEvent: () => Promise<void>;
  /** Re-read `/api/auth/session` (e.g. after editing own platform flags). */
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/** Safety net so a redirect that never reaches the target cannot strand the UI */
const HOLD_TIMEOUT_MS = 3000;

function normalizePath(path: string) {
  return path.replace(/\/$/, "") || "/";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [snapshot, setSnapshot] = useState<AuthSnapshot>(EMPTY_AUTH_SNAPSHOT);
  const [sessionStatus, setSessionStatus] = useState<
    "loading" | "ready" | "unavailable"
  >("loading");
  const authChannel = useRef<BroadcastChannel | null>(null);
  const sessionRequest = useRef<AbortController | null>(null);
  const changingSession = useRef(false);
  /** Soft-nav target — AuthGuard shows hold instead of 403 during role switches */
  const [pendingPath, setPendingPath] = useState<string | null>(null);

  const refreshAuth = useCallback(async () => {
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
      setSnapshot(EMPTY_AUTH_SNAPSHOT);
      setSessionStatus("unavailable");
    }
  }, []);

  useEffect(() => {
    clearLegacyAuthStorage();

    const onFocus = () => {
      void refreshAuth();
    };
    const onChannelMessage = () => {
      void refreshAuth();
    };

    const channel =
      typeof BroadcastChannel === "function"
        ? new BroadcastChannel("eventsurvey-auth")
        : null;
    authChannel.current = channel;
    channel?.addEventListener("message", onChannelMessage);
    globalThis.addEventListener("focus", onFocus);
    void refreshAuth();

    return () => {
      sessionRequest.current?.abort();
      globalThis.removeEventListener("focus", onFocus);
      channel?.removeEventListener("message", onChannelMessage);
      channel?.close();
      authChannel.current = null;
    };
  }, [refreshAuth]);

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
            ? next.user
              ? next.inspectedEventId
                ? "/event"
                : getHomePathForRole(next.user.role, next)
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
      await changeSession(async () => {
        await loginWithCredentials({ email, password });
        return getAuthSnapshot(new AbortController().signal);
      });
    },
    [changeSession],
  );

  const logout = useCallback(async () => {
    await changeSession(async () => {
      await signOut();
      return EMPTY_AUTH_SNAPSHOT;
    });
  }, [changeSession]);

  const inspectEvent = useCallback(
    async (eventId: string, path = "/event") => {
      await changeSession(() => startEventInspection(eventId), path);
    },
    [changeSession],
  );

  const stopInspectingEvent = useCallback(async () => {
    await changeSession(endEventInspection, "/admin/events");
  }, [changeSession]);

  const value = useMemo<AuthContextValue>(
    () => {
      const { user, realUser, inspectedEventId } = snapshot;
      const actingAsAnotherUser = user?.id !== realUser?.id;
      return {
        ...snapshot,
        allowAdmin: canEnterAdminArea(realUser?.role, actingAsAnotherUser),
        allowEvent: canEnterEventArea(
          user?.role,
          realUser?.role,
          actingAsAnotherUser,
          inspectedEventId,
        ),
        isInspectingEvent: Boolean(inspectedEventId),
        isLoading: sessionStatus === "loading" || isHolding,
        authUnavailable: sessionStatus === "unavailable",
        login,
        logout,
        inspectEvent,
        stopInspectingEvent,
        refreshAuth,
      };
    },
    [
      snapshot,
      sessionStatus,
      isHolding,
      login,
      logout,
      inspectEvent,
      stopInspectingEvent,
      refreshAuth,
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
