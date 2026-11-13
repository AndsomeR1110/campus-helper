"use client";

import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";
import { THEME_STORAGE_KEY } from "./theme-script";

export type ThemePreference = "system" | "light" | "dark";

const OPTIONS: { value: ThemePreference; label: string; icon: LucideIcon }[] = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

const listeners = new Set<() => void>();

function readPreference(): ThemePreference {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function setPreference(value: ThemePreference) {
  try {
    if (value === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, value);
  } catch {
    // Storage blocked: still apply for this page view.
  }
  const apply = (window as Window & { __applyTheme?: () => void }).__applyTheme;
  if (apply) apply();
  else document.documentElement.setAttribute("data-theme", value === "dark" ? "dark" : "light");
  listeners.forEach((listener) => listener());
}

/** Segmented System / Light / Dark control. The choice is stored on this device only. */
export function ThemeSwitcher({ className }: { className?: string }) {
  const current = useSyncExternalStore(subscribe, readPreference, () => "system" as const);

  return (
    <div
      role="group"
      aria-label="Theme"
      className={cn("flex gap-1 rounded-full bg-surface-muted p-1", className)}
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const checked = current === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={checked}
            onClick={() => setPreference(value)}
            className={cn(
              "flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-body-sm font-medium transition-[background-color,color,box-shadow] duration-150",
              checked ? "bg-surface text-primary shadow-card" : "text-text-muted hover:text-text",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </button>
        );
      })}
    </div>
  );
}
