"use client";

import {
  FileQuestion,
  RotateCw,
  ServerCrash,
  ShieldX,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export type ErrorKind = "offline" | "forbidden" | "not-found" | "server";

const DEFAULTS: Record<ErrorKind, { icon: LucideIcon; title: string; description: string }> = {
  offline: {
    icon: WifiOff,
    title: "You’re offline",
    description: "Check your connection and try again.",
  },
  forbidden: {
    icon: ShieldX,
    title: "You don’t have access",
    description: "This page is only available to authorised users.",
  },
  "not-found": {
    icon: FileQuestion,
    title: "Not found",
    description: "It may have been removed or is no longer available.",
  },
  server: {
    icon: ServerCrash,
    title: "Something went wrong",
    description: "We couldn’t load this right now. Please try again.",
  },
};

export interface ErrorStateProps {
  kind?: ErrorKind;
  /** Override the default title for the kind. */
  title?: string;
  description?: ReactNode;
  /** Shows a "Try again" button. Pass `reset` from error.tsx or a refetch. */
  onRetry?: () => void;
  /** Extra action, e.g. a link back home. */
  action?: ReactNode;
  className?: string;
}

/** Failure state with a retry (ui-ux-spec §4.10). Never shows technical details. */
export function ErrorState({
  kind = "server",
  title,
  description,
  onRetry,
  action,
  className,
}: ErrorStateProps) {
  const defaults = DEFAULTS[kind];
  const Icon = defaults.icon;
  return (
    <div
      role="alert"
      className={cn("flex flex-col items-center gap-2 px-4 py-12 text-center", className)}
    >
      <Icon className="mb-2 size-12 text-text-disabled" strokeWidth={1.5} aria-hidden />
      <h2 className="text-subtitle text-text">{title ?? defaults.title}</h2>
      <p className="max-w-80 text-body-sm text-text-muted">{description ?? defaults.description}</p>
      {(onRetry || action) && (
        <div className="mt-4 flex gap-2">
          {onRetry && (
            <Button variant="secondary" onClick={onRetry}>
              <RotateCw />
              Try again
            </Button>
          )}
          {action}
        </div>
      )}
    </div>
  );
}
