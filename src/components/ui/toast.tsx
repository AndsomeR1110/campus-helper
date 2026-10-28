"use client";

import { CircleAlert, CircleCheck, Info, X, type LucideIcon } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

const DURATION_MS = 4000;

let toasts: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function push(type: ToastType, message: string) {
  const id = nextId++;
  toasts = [...toasts, { id, type, message }];
  emit();
  return id;
}

function dismiss(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

/**
 * Short-lived feedback (ui-ux-spec §4.7). Call from client code:
 * `toast.success("Booking cancelled")`. Requires <Toaster /> in the root layout.
 * Do not use a toast as the only confirmation of a booking — navigate to the result too.
 */
export const toast = {
  success: (message: string) => push("success", message),
  error: (message: string) => push("error", message),
  info: (message: string) => push("info", message),
  dismiss,
};

/** Test helper: clears all toasts. */
export function resetToasts() {
  toasts = [];
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const EMPTY: ToastItem[] = [];

const STYLES: Record<ToastType, { icon: LucideIcon; iconClass: string }> = {
  success: { icon: CircleCheck, iconClass: "text-success" },
  error: { icon: CircleAlert, iconClass: "text-danger" },
  info: { icon: Info, iconClass: "text-info" },
};

function ToastView({ item }: { item: ToastItem }) {
  const { icon: Icon, iconClass } = STYLES[item.type];

  useEffect(() => {
    const timer = setTimeout(() => dismiss(item.id), DURATION_MS);
    return () => clearTimeout(timer);
  }, [item.id]);

  return (
    <div
      role={item.type === "error" ? "alert" : "status"}
      className="pointer-events-auto flex w-full items-start gap-3 rounded-md border border-border bg-surface p-4 shadow-overlay md:w-90"
    >
      <Icon className={cn("mt-0.5 size-5 shrink-0", iconClass)} aria-hidden />
      <p className="flex-1 text-body-sm text-text">{item.message}</p>
      <button
        type="button"
        onClick={() => dismiss(item.id)}
        aria-label="Dismiss"
        className="-m-1 rounded-sm p-1 text-text-muted hover:text-text"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

/** Renders active toasts. Mounted once in the root layout. */
export function Toaster() {
  const items = useSyncExternalStore(
    subscribe,
    () => toasts,
    () => EMPTY,
  );
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-0 z-60 flex flex-col items-center gap-2 p-4 pt-[max(16px,env(safe-area-inset-top))] md:inset-x-auto md:top-auto md:right-0 md:bottom-0 md:items-end md:p-6"
    >
      {items.map((item) => (
        <ToastView key={item.id} item={item} />
      ))}
    </div>
  );
}
