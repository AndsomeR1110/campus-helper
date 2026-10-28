import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Card classes. Use `interactive` when the whole card is a link, e.g.
 * `<Link href="…" className={cardStyles({ interactive: true })}>`.
 */
export function cardStyles({
  interactive = false,
  className,
}: { interactive?: boolean; className?: string } = {}) {
  return cn(
    "block rounded-md border border-border bg-surface p-4 shadow-card",
    interactive && "transition-colors duration-150 hover:border-border-strong",
    className,
  );
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cardStyles({ className })} {...props} />;
}

export interface ListItemProps {
  /** 40px leading slot: icon, thumbnail or avatar. */
  leading?: ReactNode;
  title: ReactNode;
  /** Secondary line(s); clamped to two lines. */
  description?: ReactNode;
  /** Trailing slot: StatusBadge, ChevronRight, small button. */
  trailing?: ReactNode;
  className?: string;
}

/** Row layout for list cards (ui-ux-spec §4.4). Wrap in a Card or a Link with `cardStyles`. */
export function ListItem({ leading, title, description, trailing, className }: ListItemProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {leading && (
        <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-sm [&_svg]:size-5">
          {leading}
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="truncate text-subtitle text-text">{title}</div>
        {description && (
          <div className="line-clamp-2 text-body-sm text-text-muted">{description}</div>
        )}
      </div>
      {trailing && <div className="flex shrink-0 items-center gap-2">{trailing}</div>}
    </div>
  );
}
