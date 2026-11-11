import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/time";
import { typeColorClasses, type TagType } from "./type-tag";

/**
 * Calendar-leaf tile ("NOV / 12 / Thu") in the service colour, for the
 * leading slot of booking and event cards. Decorative: the card text carries
 * the date for screen readers.
 */
export function DateTile({
  iso,
  type,
  size = "md",
  className,
}: {
  iso: string;
  type: TagType;
  size?: "md" | "lg";
  className?: string;
}) {
  // formatDate → "Thu 12 Nov" in Asia/Shanghai
  const [weekday, day, month] = formatDate(iso).split(" ");
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 flex-col items-center justify-center rounded-md leading-none",
        typeColorClasses(type),
        size === "lg" ? "size-18 gap-1" : "size-14 gap-0.5",
        className,
      )}
    >
      <span className="text-[10px] font-semibold tracking-wider uppercase">{month}</span>
      <span className={cn("font-bold tabular-nums", size === "lg" ? "text-display" : "text-title")}>
        {day}
      </span>
      <span className="text-[10px] font-medium opacity-80">{weekday}</span>
    </span>
  );
}
