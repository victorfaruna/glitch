"use client";

import { useEffect, useSyncExternalStore } from "react";

type Theme = "light" | "dark";
const STORAGE_KEY = "glitch-theme";
const listeners = new Set<() => void>();
let theme: Theme = "light";
let initialized = false;

function readSavedTheme(): Theme {
  try {
    return localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function subscribe(listener: () => void) {
  if (!initialized) {
    theme = readSavedTheme();
    initialized = true;
  }
  listeners.add(listener);
  function onStorage(event: StorageEvent) {
    if (event.key === STORAGE_KEY || event.key === null) {
      theme = readSavedTheme();
      listeners.forEach((notify) => notify());
    }
  }
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useTheme() {
  const value = useSyncExternalStore(
    subscribe,
    () => theme,
    () => "light" as const,
  );
  useEffect(() => {
    document.documentElement.dataset.theme = value;
  }, [value]);

  function toggleTheme() {
    theme = value === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* Theme remains usable without persistence. */
    }
    listeners.forEach((notify) => notify());
  }
  return { theme: value, toggleTheme };
}
