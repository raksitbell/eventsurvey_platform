"use client";

import { usePathname } from "@/i18n/navigation";
import type React from "react";
import { createContext, useContext, useState, useSyncExternalStore } from "react";

type SidebarContextType = {
  isDesktop: boolean;
  isExpanded: boolean;
  isMobileOpen: boolean;
  isHovered: boolean;
  activeItem: string | null;
  openSubmenu: string | null;
  toggleSidebar: () => void;
  closeMobileSidebar: (restoreFocus?: boolean) => void;
  setIsHovered: (isHovered: boolean) => void;
  setActiveItem: (item: string | null) => void;
  toggleSubmenu: (item: string) => void;
};

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const sidebarToggleId = "app-sidebar-toggle";
const sidebarDockQuery = "(min-width: 1280px)";

function subscribeToViewport(onStoreChange: () => void) {
  const viewport = window.matchMedia(sidebarDockQuery);
  viewport.addEventListener("change", onStoreChange);
  return () => viewport.removeEventListener("change", onStoreChange);
}

function getIsDesktopViewport() {
  return window.matchMedia(sidebarDockQuery).matches;
}

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [mobileOpenPath, setMobileOpenPath] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const pathname = usePathname();
  const isDesktop = useSyncExternalStore(
    subscribeToViewport,
    getIsDesktopViewport,
    () => true,
  );
  if (mobileOpenPath !== null && (isDesktop || mobileOpenPath !== pathname)) {
    setMobileOpenPath(null);
  }
  if (!isDesktop && isHovered) setIsHovered(false);
  const isMobileOpen = !isDesktop && mobileOpenPath === pathname;

  const toggleSidebar = () => {
    if (isDesktop) {
      setIsExpanded((prev) => !prev);
    } else {
      setMobileOpenPath((currentPath) =>
        currentPath === pathname ? null : pathname,
      );
    }
  };

  const closeMobileSidebar = (restoreFocus = false) => {
    setMobileOpenPath(null);
    if (restoreFocus) document.getElementById(sidebarToggleId)?.focus();
  };

  const toggleSubmenu = (item: string) => {
    setOpenSubmenu((prev) => (prev === item ? null : item));
  };

  return (
    <SidebarContext.Provider
      value={{
        isDesktop,
        isExpanded: isDesktop && isExpanded,
        isMobileOpen,
        isHovered: isDesktop && isHovered,
        activeItem,
        openSubmenu,
        toggleSidebar,
        closeMobileSidebar,
        setIsHovered,
        setActiveItem,
        toggleSubmenu,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
};
