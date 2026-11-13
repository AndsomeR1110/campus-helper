import Link from "next/link";
import type { ServiceEntry } from "@/components/layout";
import { TypeIcon, cardStyles, typeColorClasses } from "@/components/ui";
import { cn } from "@/lib/utils";

/**
 * Entry point to one of the four services. `compact` is the Home quick-access
 * size: an app-icon grid on phones (no card, one-line label) that becomes a
 * card from 768px.
 */
export function ServiceTile({
  service,
  compact = false,
}: {
  service: ServiceEntry;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <Link
        href={service.href}
        className={cn(
          "group flex h-full flex-col items-center gap-1.5 rounded-md py-1 text-center transition-transform duration-150 active:scale-95",
          "md:gap-3 md:border md:border-border md:bg-surface md:p-3 md:shadow-card md:transition-[border-color,box-shadow,transform] md:duration-200 md:ease-out",
          "md:hover:-translate-y-0.5 md:hover:border-border-strong md:hover:shadow-raised md:active:translate-y-0",
        )}
      >
        <span
          className={cn(
            "flex size-13 shrink-0 items-center justify-center rounded-md shadow-card md:size-10 md:rounded-sm md:shadow-none",
            typeColorClasses(service.type),
          )}
        >
          <TypeIcon type={service.type} className="size-6 md:size-5" />
        </span>
        <span className="w-full truncate text-caption text-text md:text-body-sm md:font-medium">
          {service.shortLabel ? (
            <>
              <span className="md:hidden">{service.shortLabel}</span>
              <span className="hidden md:inline">{service.label}</span>
            </>
          ) : (
            service.label
          )}
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={service.href}
      className={cardStyles({
        variant: "widget",
        interactive: true,
        className: "flex h-full flex-col gap-3",
      })}
    >
      <span
        className={cn(
          "flex size-12 shrink-0 items-center justify-center rounded-sm",
          typeColorClasses(service.type),
        )}
      >
        <TypeIcon type={service.type} className="size-6" />
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="text-subtitle">{service.label}</span>
        <span className="text-body-sm text-text-muted">{service.description}</span>
      </span>
    </Link>
  );
}
