import Link from "next/link";
import type { ServiceEntry } from "@/components/layout";
import { TypeIcon, cardStyles, typeColorClasses } from "@/components/ui";
import { cn } from "@/lib/utils";

/** Entry point to one of the four services. `compact` is the Home quick-access size. */
export function ServiceTile({
  service,
  compact = false,
}: {
  service: ServiceEntry;
  compact?: boolean;
}) {
  return (
    <Link
      href={service.href}
      className={cardStyles({
        interactive: true,
        className: cn(
          "flex h-full gap-3",
          compact ? "flex-col items-center p-3 text-center" : "flex-col",
        ),
      })}
    >
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-sm",
          compact ? "size-10" : "size-12",
          typeColorClasses(service.type),
        )}
      >
        <TypeIcon type={service.type} className={compact ? "size-5" : "size-6"} />
      </span>
      <span className="flex flex-col gap-0.5">
        <span className={compact ? "text-body-sm font-medium" : "text-subtitle"}>
          {service.label}
        </span>
        {!compact && <span className="text-body-sm text-text-muted">{service.description}</span>}
      </span>
    </Link>
  );
}
