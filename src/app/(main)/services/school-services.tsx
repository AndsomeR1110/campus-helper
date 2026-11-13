import Link from "next/link";
import { Bus, ChevronRight, ClipboardCheck, DoorOpen, type LucideIcon } from "lucide-react";
import { cardStyles } from "@/components/ui";
import { cn } from "@/lib/utils";

interface SchoolService {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Tile colours: map-yellow for transport, service colours otherwise. */
  tone: string;
  /** Honest availability, shown as text next to the name. */
  availability: string;
}

/** Services that use the student's university account (Android app). */
const SCHOOL_SERVICES: readonly SchoolService[] = [
  {
    href: "/services/shuttle",
    label: "Shuttle bus",
    description: "Book, board and manage campus trips",
    icon: Bus,
    tone: "bg-accent-subtle text-accent",
    availability: "Android app",
  },
  {
    href: "/services/rooms",
    label: "Discussion rooms",
    description: "Book a group room at Taicang campus",
    icon: DoorOpen,
    tone: "bg-event-space-subtle text-event-space",
    availability: "Not connected yet",
  },
  {
    href: "/services/attendance",
    label: "Class check-in",
    description: "Check in with your teacher’s class code",
    icon: ClipboardCheck,
    tone: "bg-event-class-subtle text-event-class",
    availability: "Not connected yet",
  },
];

export function SchoolServices() {
  return (
    <section aria-labelledby="school-services" className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h2 id="school-services" className="text-caption tracking-wide text-text-muted uppercase">
          School services
        </h2>
        <p className="text-body-sm text-text-muted">
          Use your university account in the Campus Helper Android app.
        </p>
      </div>
      <ul className="grid gap-3 md:grid-cols-3">
        {SCHOOL_SERVICES.map((s) => (
          <li key={s.href}>
            <Link
              href={s.href}
              className={cardStyles({
                variant: "widget",
                interactive: true,
                className: "flex h-full items-center gap-3 md:flex-col md:items-start",
              })}
            >
              <span
                className={cn(
                  "flex size-12 shrink-0 items-center justify-center rounded-sm",
                  s.tone,
                )}
              >
                <s.icon className="size-6" aria-hidden />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-subtitle">{s.label}</span>
                <span className="text-body-sm text-text-muted">{s.description}</span>
                <span className="text-caption text-text-muted">{s.availability}</span>
              </span>
              <ChevronRight className="size-5 shrink-0 text-text-muted md:hidden" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
