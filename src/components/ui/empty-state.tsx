import { Inbox, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon?: LucideIcon;
  /** Describe the state: "No bookings yet". */
  title: string;
  /** Tell the user what they can do. */
  description?: ReactNode;
  /** Optional call to action, e.g. a Link styled with buttonStyles(). */
  action?: ReactNode;
  className?: string;
}

/** Shown when a list has no data, or no results after filtering (ui-ux-spec §4.9). */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center gap-2 px-4 py-12 text-center", className)}>
      <Icon className="mb-2 size-12 text-text-disabled" strokeWidth={1.5} aria-hidden />
      <h2 className="text-subtitle text-text">{title}</h2>
      {description && <p className="max-w-80 text-body-sm text-text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
