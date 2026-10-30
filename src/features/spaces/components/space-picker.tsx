"use client";

import { useState } from "react";
import { PageContainer, StickyActionBar, TopBar } from "@/components/layout";
import {
  Button,
  cardStyles,
  Chip,
  ChipGroup,
  DemoDataNotice,
  EmptyState,
  ErrorState,
  FormField,
  Input,
  Skeleton,
} from "@/components/ui";
import { formatDate, formatTimeRange } from "@/lib/time";
import { SEAT_TYPE_LABELS } from "../constants";
import type { Space, TimeRange } from "../types";

export function bookingFailureMessage(error: unknown) {
  if (typeof error === "object" && error !== null) {
    if (
      ("status" in error && error.status === 409) ||
      ("code" in error && error.code === "BOOKING_CONFLICT")
    )
      return "This seat or your time is already booked. Your selection has been kept. Refresh availability and choose another seat or time.";
    if (error instanceof TypeError || ("code" in error && error.code === "OFFLINE"))
      return "We couldn’t connect. Check your connection and try again. Your selection has been kept.";
  }
  return "We couldn’t confirm this booking. Please try again. Your selection has been kept.";
}

/** Body only. The route supplies its header/container and a real server action. */
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
  const [seatType, setSeatType] = useState(params.get("type") ?? "");
  const seat = spaces.find((s) => s.id === selected && s.available);
  async function book() {
    if (!seat || pending) return;
    setPending(true);
    setFailure(undefined);
    try {
      await onBook(seat.id, range);
    } catch (error) {
      setFailure(bookingFailureMessage(error));
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <DemoDataNotice />
      <form action="/spaces" method="get" className="grid min-w-0 gap-4 md:grid-cols-3">
        <FormField label="Date" required>
          <Input name="date" type="date" defaultValue={params.get("date") ?? ""} />
        </FormField>
        <FormField label="Start time" required>
          <Input name="start" type="time" step="1800" defaultValue={params.get("start") ?? ""} />
        </FormField>
        <FormField label="End time" required>
          <Input name="end" type="time" step="1800" defaultValue={params.get("end") ?? ""} />
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
        <input type="hidden" name="type" value={seatType} />
        <ChipGroup label="Seat type">
          <Chip className="min-h-11" selected={!seatType} onClick={() => setSeatType("")}>
            All types
          </Chip>
          {Object.entries(SEAT_TYPE_LABELS).map(([value, label]) => (
            <Chip
              key={value}
              className="min-h-11"
              selected={seatType === value}
              onClick={() => setSeatType(value)}
            >
              {label}
            </Chip>
          ))}
        </ChipGroup>
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
        <div
          role="group"
          aria-label="Choose a seat"
          className="grid gap-3 md:grid-cols-2 lg:grid-cols-3"
        >
          {spaces.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={selected === s.id}
              disabled={!s.available || pending}
              onClick={() => {
                setSelected(s.id);
                setFailure(undefined);
              }}
              className={cardStyles({
                interactive: true,
                className: `text-left focus-visible:outline-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed ${selected === s.id ? "border-primary bg-primary-subtle" : ""}`,
              })}
            >
              <span className="block text-subtitle">Seat {s.seat}</span>
              <span className="block text-body-sm text-text-muted">
                {s.campus} · {s.building} · Floor {s.floor}
              </span>
              <span className="block text-body-sm">
                {SEAT_TYPE_LABELS[s.type]} · Capacity {s.capacity} ·{" "}
                {s.power ? "Power socket" : "No power socket"}
              </span>
              <span className="block text-body-sm">
                {s.discussion ? "Discussion allowed" : "Quiet study"} ·{" "}
                {s.available ? "Available" : "Booked"}
                {selected === s.id ? " · Selected" : ""}
              </span>
            </button>
          ))}
        </div>
      )}
      <p className="text-body-sm text-text-muted">
        30-minute steps · 30–180 minutes · within the next 7 days. Times shown in Asia/Shanghai.
      </p>
      <StickyActionBar
        summary={`${formatDate(range.startsAt)} · ${formatTimeRange(range.startsAt, range.endsAt)}`}
      >
        {failure && (
          <p role="alert" className="text-body-sm text-danger">
            {failure}
          </p>
        )}
        <Button
          size="lg"
          fullWidth
          disabled={!seat || loading || !!error}
          loading={pending}
          onClick={book}
        >
          Book selected seat
        </Button>
      </StickyActionBar>
    </>
  );
}

/** For PG-09 (focused detail route). PG-08 uses the list without a sticky action. */
export function SpaceSelectionView(props: Parameters<typeof SpacePicker>[0]) {
  return (
    <>
      <TopBar title="Choose a study seat" backHref="/spaces" />
      <PageContainer width="content">
        <SpacePicker key={props.query} {...props} />
      </PageContainer>
    </>
  );
}
