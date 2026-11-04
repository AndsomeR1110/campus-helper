import { Bell, CalendarDays, Inbox } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { PageContainer, SERVICES } from "@/components/layout";
import { Card, EmptyState, ListItem, OfflineBanner, Skeleton, buttonStyles } from "@/components/ui";
import { getCurrentUser } from "@/features/courses/server";
import { listForUser } from "@/features/notifications/server";
import { loadNextClass } from "@/features/schedule/server";
import { formatDate, formatGreeting, formatRelativeTime, formatTimeRange } from "@/lib/time";
import { HomeSection } from "../_components/home-section";
import { ServiceTile } from "../_components/service-tile";

export const metadata: Metadata = { title: "Home" };

// Reads the session and the database on every request (task #29).
export const instant = false;

/** Depends on the current time, so it renders per request inside <Suspense>. */
async function Greeting() {
  await connection();
  const now = new Date();
  const user = await getCurrentUser();

  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-display">
        {formatGreeting(now)}, {user.name.split(" ")[0]}
      </h1>
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

/** Next class card (HOME-AC-01). */
async function NextClass() {
  await connection();
  const user = await getCurrentUser();
  const next = await loadNextClass(user.id, new Date());

  if (!next) {
    return (
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
    );
  }

  return (
    <Link href={next.href} className="block">
      <Card>
        <ListItem
          title={next.title}
          description={
            <span className="tabular-nums">
              {formatTimeRange(next.startsAt, next.endsAt)}
              {next.location ? ` · ${next.location}` : ""}
            </span>
          }
        />
      </Card>
    </Link>
  );
}

/** Recent notifications plus the unread count (HOME-AC-02). */
async function RecentNotifications() {
  await connection();
  const user = await getCurrentUser();
  const { items, unread } = await listForUser(user.id);
  const recent = items.slice(0, 3);

  if (recent.length === 0) {
    return (
      <Card className="p-0">
        <EmptyState icon={Bell} title="You’re all caught up" className="py-6" />
      </Card>
    );
  }

  return (
    <Card className="p-0">
      <ul className="divide-y divide-border">
        {recent.map((item) => (
          <li key={item.id}>
            <Link href={item.href} className="block px-4 py-3">
              <ListItem
                title={item.title}
                description={`${item.body} · ${formatRelativeTime(item.createdAt)}`}
              />
            </Link>
          </li>
        ))}
      </ul>
      {unread > 0 && (
        <p className="border-t border-border px-4 py-2 text-body-sm text-text-muted">
          {unread} unread
        </p>
      )}
    </Card>
  );
}

/** Unread badge for the bell (HOME-AC-02). */
async function UnreadBadge() {
  await connection();
  const user = await getCurrentUser();
  const { unread } = await listForUser(user.id);

  if (unread === 0) {
    return null;
  }

  return (
    <span className="absolute -top-0.5 -right-0.5 flex min-w-5 items-center justify-center rounded-full bg-primary px-1 text-caption font-semibold text-on-primary tabular-nums">
      {unread > 9 ? "9+" : unread}
    </span>
  );
}

// PG-02. Data wiring for task #29.
export default function HomePage() {
  return (
    <>
      {/* Home has no TopBar, so it renders the connectivity banner itself. */}
      <OfflineBanner className="sticky top-0 z-30 pt-[max(8px,env(safe-area-inset-top))]" />
      <PageContainer className="pt-[max(24px,env(safe-area-inset-top))] md:pt-8">
        <div className="flex items-start justify-between gap-4">
          <Suspense fallback={<GreetingSkeleton />}>
            <Greeting />
          </Suspense>
          <Link
            href="/notifications"
            aria-label="Notifications"
            className="relative -mr-2 flex size-11 shrink-0 items-center justify-center rounded-full text-text hover:bg-surface-muted"
          >
            <Bell className="size-6" aria-hidden />
            <Suspense fallback={null}>
              <UnreadBadge />
            </Suspense>
          </Link>
        </div>

        <HomeSection title="Next class" seeAllHref="/schedule">
          <Suspense fallback={<Skeleton className="h-20 w-full" aria-hidden />}>
            <NextClass />
          </Suspense>
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
            <Suspense fallback={<Skeleton className="h-24 w-full" aria-hidden />}>
              <RecentNotifications />
            </Suspense>
          </HomeSection>
        </div>
      </PageContainer>
    </>
  );
}
