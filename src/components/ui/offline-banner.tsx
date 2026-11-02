"use client";

import { CircleCheck, WifiOff } from "lucide-react";
import { useOffline } from "next/offline";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const BACK_ONLINE_MS = 3000;

/**
 * Connectivity banner (ui-ux-spec §4.15, PWA-AC-03). Rendered by TopBar, so
 * every page that follows the layout rules gets it; pages without a TopBar
 * (Home) render it themselves.
 */
export function OfflineBanner({ className }: { className?: string }) {
  const offline = useOffline();
  const [previousOffline, setPreviousOffline] = useState(offline);
  const [backOnline, setBackOnline] = useState(false);

  // Show "Back online" on the offline → online transition (adjusting state
  // during render rather than in an effect, per React's guidance).
  if (offline !== previousOffline) {
    setPreviousOffline(offline);
    setBackOnline(previousOffline && !offline);
  }

  useEffect(() => {
    if (!backOnline) return;
    const timer = setTimeout(() => setBackOnline(false), BACK_ONLINE_MS);
    return () => clearTimeout(timer);
  }, [backOnline]);

  if (!offline && !backOnline) return null;

  return (
    <div
      role="status"
      className={cn(
        "flex items-center justify-center gap-2 px-4 py-2 text-center text-body-sm",
        offline ? "bg-warning-subtle text-warning" : "bg-success-subtle text-success",
        className,
      )}
    >
      {offline ? (
        <>
          <WifiOff className="size-4 shrink-0" aria-hidden />
          <span>You’re offline. Bookings and posts are unavailable until you reconnect.</span>
        </>
      ) : (
        <>
          <CircleCheck className="size-4 shrink-0" aria-hidden />
          <span>Back online</span>
        </>
      )}
    </div>
  );
}
