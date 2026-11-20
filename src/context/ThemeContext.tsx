"use client";

import type React from "react";
import { createContext, useContext, useEffect, useSyncExternalStore } from "react";

type ThemeMode = "light" | "dark" | "auto";
type ResolvedTheme = "light" | "dark";

type ThemeContextType = {
  theme: ResolvedTheme; // Resolved theme actually active ("light" or "dark")
  themeMode: ThemeMode; // The configured preference ("light", "dark", or "auto")
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_MODE_CHANGE_EVENT = "event-surway-theme-mode";

function getStoredThemeMode(): ThemeMode {
  const savedMode = localStorage.getItem("theme-mode") as ThemeMode | null;
  const legacySavedTheme = localStorage.getItem(
    "theme",
  ) as ResolvedTheme | null;
  return savedMode || legacySavedTheme || "light";
}

function subscribeToThemeMode(onStoreChange: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === "theme-mode" || event.key === "theme") onStoreChange();
  };
  window.addEventListener(THEME_MODE_CHANGE_EVENT, onStoreChange);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(THEME_MODE_CHANGE_EVENT, onStoreChange);
    window.removeEventListener("storage", handleStorage);
  };
}

function subscribeToSystemTheme(onStoreChange: () => void) {
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  mediaQuery.addEventListener("change", onStoreChange);
  return () => mediaQuery.removeEventListener("change", onStoreChange);
}

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const themeMode = useSyncExternalStore<ThemeMode>(
    subscribeToThemeMode,
    getStoredThemeMode,
    () => "light",
  );
  const systemTheme = useSyncExternalStore<ResolvedTheme>(
    subscribeToSystemTheme,
    getSystemTheme,
    () => "light",
  );
  const theme = themeMode === "auto" ? systemTheme : themeMode;

  useEffect(() => {
    localStorage.setItem("theme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-color-scheme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.setAttribute("data-color-scheme", "light");
    }
  }, [theme]);

  const setThemeMode = (mode: ThemeMode) => {
    localStorage.setItem("theme-mode", mode);
    window.dispatchEvent(new Event(THEME_MODE_CHANGE_EVENT));
  };

  const toggleTheme = () => {
    setThemeMode(theme === "light" ? "dark" : "light");
  };

  return (
    <ThemeContext.Provider
      value={{ theme, themeMode, setThemeMode, toggleTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
