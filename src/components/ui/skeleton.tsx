import { cn } from "@/lib/utils";

/** Placeholder block shown while content loads. Match the shape of the real content. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-sm bg-surface-muted", className)} />;
}
