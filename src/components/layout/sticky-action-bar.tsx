import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface StickyActionBarProps {
  /** Optional one-line summary above the button, e.g. "Mon 3 Nov · 14:00–16:00". */
  summary?: ReactNode;
  /** Usually one `<Button size="lg" fullWidth>`. */
  children: ReactNode;
  className?: string;
}

/**
 * Primary action for detail and form pages (ui-ux-spec §4.13). Fixed to the
 * bottom on phones and tablets; sits at the end of the content on desktop.
 * Only use on pages where BottomNav is hidden (see FOCUSED_ROUTES in nav-config).
 */
export function StickyActionBar({ summary, children, className }: StickyActionBarProps) {
  return (
    <>
      <div aria-hidden className="h-[calc(104px+env(safe-area-inset-bottom))] lg:hidden" />
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]",
          "lg:static lg:mt-6 lg:border-t-0 lg:bg-transparent lg:p-0",
          className,
        )}
      >
        <div className="mx-auto flex max-w-content flex-col gap-2">
          {summary && (
            <p className="text-center text-body-sm text-text-muted tabular-nums lg:text-left">
              {summary}
            </p>
          )}
          {children}
        </div>
      </div>
    </>
  );
}
