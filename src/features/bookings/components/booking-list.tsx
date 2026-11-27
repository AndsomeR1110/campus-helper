"use client";
import { useTranslations } from "@/lib/i18n/client";
import { CalendarCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  cardStyles,
  Chip,
  ChipGroup,
  DateTile,
  DemoDataNotice,
  EmptyState,
  LocationText,
  StatusBadge,
  TypeTag,
} from "@/components/ui";
import { formatTimeRange } from "@/lib/time";
import { BOOKING_LABELS, BOOKING_TAGS } from "../constants";
import type { BookingKind, BookingListResult } from "../types";
export function BookingList({
  result,
  filter,
}: {
  result: BookingListResult;
  filter: BookingKind | "all";
}) {
  const t = useTranslations();
  const router = useRouter();
  const visible = result.bookings.filter((b) => filter === "all" || b.kind === filter);
  const relevant =
    filter === "all" ? result.unavailable : result.unavailable.filter((k) => k === filter);
  return (
    <>
      <DemoDataNotice />
      <ChipGroup label={t("Booking type")}>
        {(["all", "office", "space"] as const).map((kind) => (
          <Chip
            key={kind}
            selected={filter === kind}
            onClick={() => router.push(kind === "all" ? "/bookings" : `/bookings?type=${kind}`)}
          >
            {kind === "all" ? t("All types") : t(BOOKING_LABELS[kind])}
          </Chip>
        ))}
      </ChipGroup>
      {result.unavailable.map((kind) => (
        <Card key={kind}>
          <p role="status" className="text-body-sm">
            {t(BOOKING_LABELS[kind])} {t("bookings are unavailable.")}{" "}
            {kind === "office"
              ? t("The Office Hour service is not connected yet or could not be loaded.")
              : t("We couldn’t load your seat bookings.")}{" "}
            {t("Other available bookings are shown below.")}
          </p>
          <Button variant="secondary" onClick={() => router.refresh()}>
            {t("Try again")}
          </Button>
        </Card>
      ))}
      {visible.length === 0 && relevant.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title={t("No bookings to show")}
          description={t(
            "Bookings of this type will appear here after you reserve a seat or an Office Hour.",
          )}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {visible.map((b) => (
            <Link
              key={b.id}
              href={b.href}
              className={cardStyles({ interactive: true, className: "flex gap-3" })}
            >
              <DateTile iso={b.startsAt} type={BOOKING_TAGS[b.kind]} />
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex items-center justify-between gap-2">
                  <TypeTag type={BOOKING_TAGS[b.kind]} />
                  <StatusBadge kind="booking" status={b.status} />
                </span>
                <h2 className="truncate text-subtitle">{b.title}</h2>
                <span className="text-body-sm tabular-nums">
                  {formatTimeRange(b.startsAt, b.endsAt)}
                </span>
                {b.location ? (
                  <LocationText location={b.location} className="text-body-sm text-text-muted" />
                ) : (
                  <span className="text-body-sm text-text-muted">
                    {t("Location not specified")}
                  </span>
                )}
              </span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
