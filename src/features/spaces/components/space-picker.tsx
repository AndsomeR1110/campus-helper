"use client";

import { useState } from "react";
import {
  Button,
  Card,
  Chip,
  ChipGroup,
  DemoDataNotice,
  EmptyState,
  ErrorState,
  FormField,
  Input,
  Select,
  Skeleton,
  TimeSlotButton,
} from "@/components/ui";
import { formatTimeRange } from "@/lib/time";
import { SEAT_TYPE_LABELS, SEAT_TYPES } from "../constants";
import type { Space, TimeRange } from "../types";

/** Request-time composition supplies availability and a real server mutation.
 * Does not fabricate availability or fall back to browser storage.
 */
export function SpacePicker({
  spaces,
  range,
  query,
  loading = false,
  error,
  onRetry,
  onBook,
}: {
  spaces: readonly (Space & { available: boolean })[];
  range: TimeRange;
  query: string;
  loading?: boolean;
  error?: string;
  onRetry: () => void;
  onBook: (spaceId: string, range: TimeRange) => Promise<void>;
}) {
  const [selected, setSelected] = useState<string>();
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<string>();
  const params = new URLSearchParams(query);
  const seat = spaces.find((s) => s.id === selected && s.available);

  async function book() {
    if (!seat || pending) return;
    setPending(true);
    setFailure(undefined);
    try {
      await onBook(seat.id, range);
    } catch {
      setFailure(
        "We couldn’t confirm this booking. The seat or your time may already be booked. Your selection has been kept; refresh availability and try again.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="mx-auto flex w-full max-w-240 min-w-0 flex-col gap-6 p-4 md:p-6">
      <h1 className="text-title-lg">Find a study space</h1>
      <DemoDataNotice />
      <form action="/spaces" method="get" className="grid min-w-0 gap-4 md:grid-cols-3">
        <FormField label="Date">
          <Input name="date" type="date" required defaultValue={params.get("date") ?? ""} />
        </FormField>
        <FormField label="Start time">
          <Input
            name="start"
            type="time"
            step="1800"
            required
            defaultValue={params.get("start") ?? ""}
          />
        </FormField>
        <FormField label="End time">
          <Input
            name="end"
            type="time"
            step="1800"
            required
            defaultValue={params.get("end") ?? ""}
          />
        </FormField>
        <FormField label="Building">
          <Input name="building" defaultValue={params.get("building") ?? ""} />
        </FormField>
        <FormField label="Floor">
          <Input
            name="floor"
            type="number"
            min="1"
            max="99"
            defaultValue={params.get("floor") ?? ""}
          />
        </FormField>
        <FormField label="Seat type">
          <Select name="type" defaultValue={params.get("type") ?? ""}>
            <option value="">All types</option>
            {SEAT_TYPES.map((type) => (
              <option key={type} value={type}>
                {SEAT_TYPE_LABELS[type]}
              </option>
            ))}
          </Select>
        </FormField>
        <Button type="submit" variant="secondary">
          Find seats
        </Button>
      </form>
      {loading ? (
        <Skeleton className="h-40" />
      ) : error ? (
        <ErrorState description={error} onRetry={onRetry} />
      ) : spaces.length === 0 ? (
        <EmptyState
          title="No matching seats"
          description="Try another building, floor or seat type."
        />
      ) : (
        <>
          <ChipGroup label="Choose a seat">
            {spaces.map((s) => (
              <Chip
                className="min-h-11"
                key={s.id}
                selected={selected === s.id}
                disabled={!s.available || pending}
                onClick={() => setSelected(s.id)}
              >
                {s.seat}
                {!s.available && " · Booked"}
              </Chip>
            ))}
          </ChipGroup>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {spaces.map((s) => (
              <Card key={s.id}>
                <h2 className="text-subtitle">Seat {s.seat}</h2>
                <p className="text-body-sm text-text-muted">
                  {s.campus} · {s.building} · Floor {s.floor}
                </p>
                <p className="text-body-sm">
                  {SEAT_TYPE_LABELS[s.type]} · Capacity {s.capacity} ·{" "}
                  {s.power ? "Power socket" : "No power socket"} ·{" "}
                  {s.discussion ? "Discussion allowed" : "Quiet study"}
                </p>
              </Card>
            ))}
          </div>
          <TimeSlotButton
            label={formatTimeRange(range.startsAt, range.endsAt)}
            selected={!!seat}
            unavailableReason={selected && !seat ? "Seat unavailable" : undefined}
          />
          <p className="text-body-sm text-text-muted">
            30-minute steps · 30–180 minutes · within the next 7 days. Times shown in Asia/Shanghai.
          </p>
          {failure && <ErrorState description={failure} onRetry={onRetry} />}
          <Button disabled={!seat} loading={pending} onClick={book}>
            Book selected seat
          </Button>
        </>
      )}
    </section>
  );
}
