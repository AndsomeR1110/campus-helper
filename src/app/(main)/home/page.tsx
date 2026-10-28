import { Bell, CalendarDays, Inbox } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { PageContainer, SERVICES } from "@/components/layout";
import { Card, EmptyState, Skeleton, buttonStyles } from "@/components/ui";
import { formatDate, formatGreeting } from "@/lib/time";
import { HomeSection } from "../_components/home-section";
import { ServiceTile } from "../_components/service-tile";

export const metadata: Metadata = { title: "Home" };

/** Depends on the current time, so it renders per request inside <Suspense>. */
async function Greeting() {
  await connection();
  const now = new Date();
  // TODO(Member 2): append the signed-in user's first name.
  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-display">{formatGreeting(now)}</h1>
      <p className="text-text-muted">{formatDate(now)}</p>
    </div>
  );
}

function GreetingSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-hidden>
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-5 w-24" />
    </div>
  );
}

// PG-02. The data sections are placeholders until Member 4's unified schedule
// (ScheduleEvent) and notification APIs are ready (HOME-AC-01, HOME-AC-02).
export default function HomePage() {
  return (
    <PageContainer className="pt-[max(24px,env(safe-area-inset-top))] md:pt-8">
      <div className="flex items-start justify-between gap-4">
        <Suspense fallback={<GreetingSkeleton />}>
          <Greeting />
        </Suspense>
        {/* TODO(Member 4): show the unread count here too. */}
        <Link
          href="/notifications"
          aria-label="Notifications"
          className="-mr-2 flex size-11 shrink-0 items-center justify-center rounded-full text-text hover:bg-surface-muted"
        >
          <Bell className="size-6" aria-hidden />
        </Link>
      </div>

      <HomeSection title="Next class">
        <Card className="p-0">
          <EmptyState
            icon={CalendarDays}
            title="No upcoming classes"
            description="Add your timetable to see your next class here."
            action={
              <Link
                href="/courses/new"
                className={buttonStyles({ variant: "secondary", size: "sm" })}
              >
                Add a course
              </Link>
            }
            className="py-6"
          />
        </Card>
      </HomeSection>

      <HomeSection title="Quick access">
        <ul className="grid grid-cols-4 gap-2 md:gap-3">
          {SERVICES.map((service) => (
            <li key={service.href}>
              <ServiceTile service={service} compact />
            </li>
          ))}
        </ul>
      </HomeSection>

      <div className="grid gap-6 md:grid-cols-2">
        <HomeSection title="Upcoming bookings" seeAllHref="/bookings">
          <Card className="p-0">
            <EmptyState
              icon={Inbox}
              title="No upcoming bookings"
              description="Office hour and study space bookings will appear here."
              className="py-6"
            />
          </Card>
        </HomeSection>

        <HomeSection title="Recent notifications" seeAllHref="/notifications">
          <Card className="p-0">
            <EmptyState icon={Bell} title="You’re all caught up" className="py-6" />
          </Card>
        </HomeSection>
      </div>
    </PageContainer>
  );
}
