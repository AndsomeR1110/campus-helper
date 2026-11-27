"use client";

import { useTranslations } from "@/lib/i18n/client";
import { Armchair } from "lucide-react";
import Link from "next/link";
import { cardStyles, DemoDataNotice, EmptyState } from "@/components/ui";
import type { Space } from "../types";
import { SeatSummary } from "./seat-summary";
import { SpaceFilterForm } from "./space-filter-form";
export function SpaceList({
  spaces,
  catalog,
  query,
  error,
  today,
}: {
  spaces: readonly (Space & { available: boolean })[];
  catalog: readonly Space[];
  query: string;
  error?: string;
  today?: string;
}) {
  const t = useTranslations();
  return (
    <>
      <DemoDataNotice />
      <SpaceFilterForm query={query} catalog={catalog} today={today} />
      {error ? (
        <p role="alert" className="text-body-sm text-danger">
          {t(error)}
        </p>
      ) : spaces.length === 0 ? (
        <EmptyState
          icon={Armchair}
          title={t("No matching seats")}
          description={t("Try another building, floor or seat type.")}
        />
      ) : (
        <>
          <p className="text-caption tracking-wide text-text-muted uppercase">
            {t("{count} seats · {available} available", {
              count: spaces.length,
              available: spaces.filter((space) => space.available).length,
            })}
          </p>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {spaces.map((space) => (
              <Link
                key={space.id}
                href={`/spaces/${encodeURIComponent(space.id)}?${query}`}
                className={cardStyles({ interactive: true, className: "h-full" })}
              >
                <SeatSummary
                  space={space}
                  availability={space.available ? "Available" : "Booked for this time"}
                />
              </Link>
            ))}
          </div>
        </>
      )}
    </>
  );
}
