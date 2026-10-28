import { Check } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface ChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  selected?: boolean;
  children: ReactNode;
}

/** Toggleable filter chip. Put several in a `ChipGroup` for a horizontally scrolling row. */
export function Chip({
  selected = false,
  className,
  type = "button",
  children,
  ...props
}: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-body-sm font-medium whitespace-nowrap transition-colors duration-150",
        selected
          ? "border-primary bg-primary-subtle text-primary"
          : "border-border-strong bg-surface text-text hover:bg-surface-muted",
        "disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {selected && <Check className="size-4" aria-hidden />}
      {children}
    </button>
  );
}

export function ChipGroup({
  label,
  className,
  children,
}: {
  /** Accessible name for the group, e.g. "Seat type". */
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 md:mx-0 md:px-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
