import { Armchair, Monitor, PlugZap, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { SEAT_TYPE_LABELS } from "../constants";
import type { SeatType, Space } from "../types";

const SEAT_ICONS: Record<SeatType, typeof Armchair> = {
  QUIET: Armchair,
  DISCUSSION: Users,
  COMPUTER: Monitor,
};

/** Shared body of a seat card: icon, seat, place, features and availability. */
export function SeatSummary({
  space,
  availability,
  selected = false,
}: {
  space: Space & { available: boolean };
  /** Text for the availability pill; defaults to "Available" / "Booked". */
  availability?: string;
  selected?: boolean;
}) {
  const Icon = SEAT_ICONS[space.type];
  return (
    <span className="flex items-start gap-3">
      <span
        aria-hidden
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-sm",
          selected ? "bg-primary text-on-primary" : "bg-event-space-subtle text-event-space",
        )}
      >
        <Icon className="size-5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-subtitle">Seat {space.seat}</span>
          <span
            className={cn(
              "shrink-0 rounded-full px-2.5 py-0.5 text-caption",
              space.available ? "bg-success-subtle text-success" : "bg-neutral-subtle text-neutral",
            )}
          >
            {availability ?? (space.available ? "Available" : "Booked")}
            {selected ? " · Selected" : ""}
          </span>
        </span>
        <span className="truncate text-body-sm text-text-muted">
          {space.building} · Floor {space.floor}
        </span>
        <span className="flex flex-wrap gap-1.5 pt-0.5 text-caption text-text-muted">
          <span className="rounded-full bg-surface-muted px-2 py-0.5">
            {SEAT_TYPE_LABELS[space.type]}
          </span>
          {space.capacity > 1 && (
            <span className="rounded-full bg-surface-muted px-2 py-0.5">
              Up to {space.capacity} people
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2 py-0.5">
            <PlugZap className="size-3.5" aria-hidden />
            {space.power ? "Power socket" : "No power socket"}
          </span>
        </span>
      </span>
    </span>
  );
}
