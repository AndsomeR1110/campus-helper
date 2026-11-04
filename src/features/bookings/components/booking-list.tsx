"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  cardStyles,
  Chip,
  ChipGroup,
  DemoDataNotice,
  EmptyState,
  StatusBadge,
  TypeTag,
} from "@/components/ui";
import { formatDateWithYear, formatTimeRange } from "@/lib/time";
import { BOOKING_LABELS, BOOKING_TAGS } from "../constants";
import type { BookingKind, BookingListResult } from "../types";
export function BookingList({
  result,
  filter,
}: {
  result: BookingListResult;
  filter: BookingKind | "all";
}) {
  const router = useRouter();
  const visible = result.bookings.filter((b) => filter === "all" || b.kind === filter);
  const relevant =
    filter === "all" ? result.unavailable : result.unavailable.filter((k) => k === filter);
  return (
    <>
      <DemoDataNotice />
      <ChipGroup label="Booking type">
        {(["all", "office", "space"] as const).map((kind) => (
          <Chip
            key={kind}
            selected={filter === kind}
            onClick={() => router.push(kind === "all" ? "/bookings" : `/bookings?type=${kind}`)}
          >
            {kind === "all" ? "All types" : BOOKING_LABELS[kind]}
          </Chip>
        ))}
      </ChipGroup>
      {result.unavailable.map((kind) => (
        <Card key={kind}>
          <p role="status" className="text-body-sm">
            {BOOKING_LABELS[kind]} bookings are unavailable.{" "}
            {kind === "office"
              ? "The Office Hour service is not connected yet or could not be loaded."
              : "We couldn’t load your seat bookings."}{" "}
            Other available bookings are shown below.
          </p>
          <Button variant="secondary" onClick={() => router.refresh()}>
            Try again
          </Button>
        </Card>
      ))}
      {visible.length === 0 && relevant.length === 0 ? (
        <EmptyState
          title="No bookings to show"
          description="Bookings of this type will appear here after you reserve a seat or an Office Hour."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {visible.map((b) => (
            <Link key={b.id} href={b.href} className={cardStyles({ interactive: true })}>
              <TypeTag type={BOOKING_TAGS[b.kind]} />
              <h2 className="mt-2 text-subtitle">{b.title}</h2>
              <p className="text-body-sm">
                {formatDateWithYear(b.startsAt)}, {formatTimeRange(b.startsAt, b.endsAt)}
              </p>
              <p className="mb-2 text-body-sm text-text-muted">
                {b.location ?? "Location not specified"}
              </p>
              <StatusBadge kind="booking" status={b.status} />
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
