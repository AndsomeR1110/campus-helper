import Link from "next/link";
import { cardStyles, DemoDataNotice, EmptyState } from "@/components/ui";
import { SEAT_TYPE_LABELS } from "../constants";
import type { Space } from "../types";
import { SpaceFilterForm } from "./space-filter-form";
export function SpaceList({
  spaces,
  catalog,
  query,
  error,
}: {
  spaces: readonly (Space & { available: boolean })[];
  catalog: readonly Space[];
  query: string;
  error?: string;
}) {
  return (
    <>
      <DemoDataNotice />
      <p className="text-body-sm text-text-muted">
        Shared demo account: Mia Chen. Bookings are not private until sign-in is connected.
      </p>
      <SpaceFilterForm query={query} catalog={catalog} />
      {error ? (
        <p role="alert" className="text-body-sm text-danger">
          {error}
        </p>
      ) : spaces.length === 0 ? (
        <EmptyState
          title="No matching seats"
          description="Try another building, floor or seat type."
        />
      ) : (
        <>
          <p className="text-body-sm text-text-muted">
            {spaces.length} seats · Times shown in Asia/Shanghai
          </p>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {spaces.map((space) => (
              <Link
                key={space.id}
                href={`/spaces/${encodeURIComponent(space.id)}?${query}`}
                className={cardStyles({ interactive: true })}
              >
                <h2 className="text-subtitle">Seat {space.seat}</h2>
                <p className="text-body-sm text-text-muted">
                  {space.campus} · {space.building} · Floor {space.floor}
                </p>
                <p className="text-body-sm">
                  {SEAT_TYPE_LABELS[space.type]} ·{" "}
                  {space.power ? "Power socket" : "No power socket"}
                </p>
                <p className="text-body-sm">
                  {space.available ? "Available" : "Booked for this time"} · View seat
                </p>
              </Link>
            ))}
          </div>
        </>
      )}
    </>
  );
}
