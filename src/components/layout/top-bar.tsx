"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { IconButton } from "@/components/ui";
import { cn } from "@/lib/utils";
import { hasInAppHistory } from "./navigation-history";

export interface TopBarProps {
  title: string;
  /**
   * Shows a back button. Goes back in history when the user navigated here
   * inside the app, otherwise to this href (e.g. after opening a notification).
   */
  backHref?: string;
  /** Up to two IconButtons on the right. */
  actions?: ReactNode;
  /** "large" for the four tab pages: left-aligned 22px title, no back button. */
  variant?: "default" | "large";
}

/** Page header (ui-ux-spec §4.11). Render it as the first child of every page. */
export function TopBar({ title, backHref, actions, variant = "default" }: TopBarProps) {
  const router = useRouter();
  const large = variant === "large";

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface pt-[env(safe-area-inset-top)]">
      <div className="relative mx-auto flex h-top-bar max-w-list items-center gap-1 px-2 md:px-4">
        {backHref && !large && (
          <IconButton
            aria-label="Back"
            onClick={() => (hasInAppHistory() ? router.back() : router.push(backHref))}
          >
            <ChevronLeft />
          </IconButton>
        )}
        <h1
          className={cn(
            "min-w-0 flex-1 truncate",
            large
              ? "px-2 text-title-lg"
              : cn(
                  "pointer-events-none absolute text-center text-title",
                  // Leave room for the back button and up to two actions.
                  actions ? "inset-x-24" : "inset-x-14",
                ),
          )}
        >
          {title}
        </h1>
        {actions && <div className="ml-auto flex items-center">{actions}</div>}
      </div>
    </header>
  );
}
