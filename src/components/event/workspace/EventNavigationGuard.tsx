"use client";

import {
  createContext,
  useContext,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";

type ConfirmLeave = () => Promise<boolean>;

const EventNavigationGuard = createContext<RefObject<ConfirmLeave | null> | null>(
  null,
);

export function useEventNavigationGuard() {
  return useContext(EventNavigationGuard);
}

export default function EventNavigationGuardProvider({
  children,
}: {
  children: ReactNode;
}) {
  const guard = useRef<ConfirmLeave | null>(null);
  return (
    <EventNavigationGuard.Provider value={guard}>
      {children}
    </EventNavigationGuard.Provider>
  );
}
