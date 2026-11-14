import { CalendarClock, Armchair, BookOpen, SearchCheck, type LucideIcon } from "lucide-react";
import { BuildingPin, CampusIllustration, Card } from "@/components/ui";
import { CAMPUS_BUILDINGS } from "@/lib/campus";
import { cn } from "@/lib/utils";

const ACADEMIC = CAMPUS_BUILDINGS.filter((b) => b.kind === "academic");
const FACILITIES = CAMPUS_BUILDINGS.filter((b) => b.kind === "facility");

function SectionTitle({ id, children }: { id: string; children: string }) {
  return (
    <h2 id={id} className="text-caption tracking-wide text-text-muted uppercase">
      {children}
    </h2>
  );
}

/** Campus map and building directory, in the style of the official campus map. */
export function CampusGuide() {
  return (
    <section aria-labelledby="campus-guide" className="flex flex-col gap-3">
      <SectionTitle id="campus-guide">Campus guide</SectionTitle>
      <Card variant="widget" className="flex flex-col gap-4 p-0">
        <div className="relative overflow-hidden rounded-t-lg">
          <CampusIllustration className="mx-auto max-w-xl px-2 pt-3" />
          <p className="absolute bottom-2 left-4 rounded-full bg-surface-translucent px-2.5 py-0.5 text-caption text-text-muted backdrop-blur">
            The ring links buildings A–G
          </p>
        </div>
        <div className="grid gap-x-6 gap-y-1 px-4 pb-2 md:grid-cols-2">
          <BuildingList title="Teaching buildings" buildings={ACADEMIC} />
          <BuildingList title="Facilities" buildings={FACILITIES} />
        </div>
      </Card>
    </section>
  );
}

function BuildingList({ title, buildings }: { title: string; buildings: typeof CAMPUS_BUILDINGS }) {
  return (
    <div className="flex flex-col">
      <h3 className="pt-2 pb-1 text-body-sm font-medium text-text-muted">{title}</h3>
      <ul className="divide-y divide-liquid-edge">
        {buildings.map((b) => (
          <li key={b.code} className="flex items-center gap-3 py-2.5">
            <BuildingPin code={b.code} kind={b.kind} size="md" />
            <div className="flex min-w-0 flex-col">
              <span className="text-body-sm font-medium">Building {b.code}</span>
              <span className="truncate text-body-sm text-text-muted">{b.summary}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

const TIPS: { icon: LucideIcon; tone: string; title: string; body: string }[] = [
  {
    icon: CalendarClock,
    tone: "bg-event-office-subtle text-event-office",
    title: "Office hours",
    body: "Pick an open slot and add a short note. Cancel from My bookings if plans change — the slot opens up again.",
  },
  {
    icon: Armchair,
    tone: "bg-event-space-subtle text-event-space",
    title: "Study spaces",
    body: "Book in 30-minute steps, 30 minutes to 3 hours, up to 7 days ahead. Demo seats, not live data.",
  },
  {
    icon: BookOpen,
    tone: "bg-event-class-subtle text-event-class",
    title: "Class reminders",
    body: "Add each course once with its weeks. Turn on a reminder to get notified before class.",
  },
  {
    icon: SearchCheck,
    tone: "bg-lost-subtle text-lost",
    title: "Lost & Found",
    body: "Describe the item, not yourself. Never post ID or phone numbers — claims stay private to the poster.",
  },
];

/** Short how-to cards for the four services. */
export function ServiceTips() {
  return (
    <section aria-labelledby="service-tips" className="flex flex-col gap-3">
      <SectionTitle id="service-tips">Good to know</SectionTitle>
      <ul className="-mx-4 flex snap-x [scrollbar-width:none] gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 lg:grid-cols-4">
        {TIPS.map(({ icon: Icon, tone, title, body }) => (
          <li key={title} className="w-64 shrink-0 snap-start md:w-auto">
            <Card variant="widget" className="flex h-full flex-col gap-2">
              <span className={cn("flex size-9 items-center justify-center rounded-sm", tone)}>
                <Icon className="size-5" aria-hidden />
              </span>
              <p className="text-subtitle">{title}</p>
              <p className="text-body-sm text-text-muted">{body}</p>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
