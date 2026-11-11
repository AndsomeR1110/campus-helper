"use client";

import { useState, type ReactNode } from "react";
import { PageContainer, StickyActionBar, TopBar } from "@/components/layout";
import {
  Button,
  cardStyles,
  DemoDataNotice,
  EmptyState,
  ErrorState,
  Skeleton,
  useOffline,
} from "@/components/ui";
import { formatDate, formatTimeRange } from "@/lib/time";
import { SeatSummary } from "./seat-summary";
import { SpaceFilterForm } from "./space-filter-form";
import type { Space, TimeRange } from "../types";

export function bookingFailureMessage(error: unknown) {
  if (typeof error === "object" && error !== null) {
    if (
      ("status" in error && error.status === 409) ||
      ("code" in error && error.code === "BOOKING_CONFLICT")
    )
      return "This seat or your time is already booked. Your selection has been kept. Refresh availability and choose another seat or time.";
    if (
      "status" in error &&
      [400, 401, 403, 404].includes(Number(error.status)) &&
      "message" in error &&
      typeof error.message === "string"
    )
      return error.message;
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
  filterAction,
  children,
}: {
  spaces: readonly (Space & { available: boolean })[];
  range: TimeRange;
  query: string;
  loading?: boolean;
  error?: string;
  onRetry: () => void;
  onBook: (spaceId: string, range: TimeRange) => Promise<void>;
  filterAction?: string;
  children?: ReactNode;
}) {
  const [selected, setSelected] = useState<string>();
  const offline = useOffline();
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<string>();
  const seat = spaces.find((s) => s.id === selected && s.available);
  async function book() {
    if (!seat || pending || offline) return;
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
      {!filterAction && <SpaceFilterForm query={query} action={filterAction} catalog={spaces} />}
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
                className: `w-full text-left focus-visible:outline-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed disabled:opacity-70 ${selected === s.id ? "border-primary bg-primary-subtle" : ""}`,
              })}
            >
              <SeatSummary space={s} selected={selected === s.id} />
            </button>
          ))}
        </div>
      )}
      {filterAction && <SpaceFilterForm query={query} action={filterAction} />}
      {children}
      <StickyActionBar
        summary={`${formatDate(range.startsAt)} · ${formatTimeRange(range.startsAt, range.endsAt)}`}
      >
        {offline && <p className="text-body-sm text-text-muted">Unavailable offline</p>}
        {failure && (
          <p role="alert" className="text-body-sm text-danger">
            {failure}
          </p>
        )}
        <Button
          size="lg"
          fullWidth
          disabled={!seat || loading || !!error || offline}
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
