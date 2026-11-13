import { MapPin } from "lucide-react";
import { buildingFromLocation, type BuildingKind } from "@/lib/campus";
import { cn } from "@/lib/utils";

/**
 * Round lettered marker in the style of the campus map: purple for academic
 * buildings (A–G), sunshine yellow for facilities (H, J, M, S).
 */
export function BuildingPin({
  code,
  kind = "academic",
  size = "sm",
  className,
}: {
  code: string;
  kind?: BuildingKind;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-bold shadow-card",
        kind === "facility" ? "bg-map-pin-alt text-black/75" : "bg-map-pin text-white",
        size === "sm" && "size-5 text-[11px] leading-none",
        size === "md" && "size-7 text-caption",
        size === "lg" && "size-10 text-subtitle",
        className,
      )}
    >
      {code}
    </span>
  );
}

/**
 * A location with a map marker: the building pin when the text names a
 * campus-map building ("Office C-308"), otherwise a plain map-pin icon.
 */
export function LocationText({
  location,
  className,
  fallbackIcon = true,
  wrap = false,
}: {
  location: string;
  className?: string;
  /** Show a map-pin icon when no building is recognised. Off where a label already has one. */
  fallbackIcon?: boolean;
  /** Let long places wrap instead of truncating. */
  wrap?: boolean;
}) {
  const building = buildingFromLocation(location);
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5", className)}>
      {building ? (
        <BuildingPin code={building.code} kind={building.kind} />
      ) : fallbackIcon ? (
        <MapPin className="size-4 shrink-0 text-text-muted" aria-hidden />
      ) : null}
      <span className={wrap ? "break-words" : "truncate"}>
        {building && <span className="sr-only">Building {building.code}: </span>}
        {location}
      </span>
    </span>
  );
}
