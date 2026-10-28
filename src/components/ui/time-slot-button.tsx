import { Check } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface TimeSlotButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children" | "disabled"
> {
  /** Display text, e.g. "14:00–14:30". Use formatTimeRange() from "@/lib/time". */
  label: string;
  selected?: boolean;
  /** When set the slot is unavailable and this reason is shown, e.g. "Booked" or "Past". */
  unavailableReason?: string;
}

/** Shared slot picker cell for office hours and study spaces (ui-ux-spec §4.16). */
export function TimeSlotButton({
  label,
  selected = false,
  unavailableReason,
  className,
  onClick,
  type = "button",
  ...props
}: TimeSlotButtonProps) {
  const unavailable = !!unavailableReason;
  return (
    <button
      type={type}
      aria-pressed={unavailable ? undefined : selected}
      aria-disabled={unavailable || undefined}
      onClick={unavailable ? undefined : onClick}
      className={cn(
        "inline-flex min-h-11 flex-col items-center justify-center rounded-sm border px-3 py-1.5 tabular-nums transition-colors duration-150",
        unavailable
          ? "cursor-not-allowed border-transparent bg-surface-muted text-text-disabled"
          : selected
            ? "border-primary bg-primary text-on-primary"
            : "border-border-strong bg-surface text-text hover:bg-surface-muted",
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          "inline-flex items-center gap-1 text-body-sm font-medium",
          unavailable && "line-through",
        )}
      >
        {selected && !unavailable && <Check className="size-4" aria-hidden />}
        {label}
      </span>
      {unavailable && <span className="text-caption text-neutral">{unavailableReason}</span>}
    </button>
  );
}
