"use client";

import { Info, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export const ACADEMIC_PROJECT_DISCLAIMER =
  "CAMPUS HELPER is an academic project. Bookings are not recorded in any official university system.";

export interface DemoDataNoticeProps {
  /**
   * "banner" (default): dismissible info bar at the top of booking pages; reappears on every visit.
   * "footer": the static project disclaimer for Login and Profile.
   */
  variant?: "banner" | "footer";
  className?: string;
}

/** Academic-project / demo-data disclosure (ui-ux-spec §4.14, SP-AC-07). */
export function DemoDataNotice({ variant = "banner", className }: DemoDataNoticeProps) {
  const [dismissed, setDismissed] = useState(false);

  if (variant === "footer") {
    return (
      <p className={cn("text-center text-caption text-text-muted", className)}>
        {ACADEMIC_PROJECT_DISCLAIMER}
      </p>
    );
  }

  if (dismissed) return null;

  return (
    <div
      role="note"
      className={cn(
        "flex items-start gap-2 rounded-md bg-info-subtle py-2.5 pr-2 pl-3 text-body-sm text-info",
        className,
      )}
    >
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
      <p className="flex-1">Demo data — not official real-time availability.</p>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Hide demo data notice"
        className="-my-1 rounded-sm p-1 hover:bg-primary-subtle"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}
