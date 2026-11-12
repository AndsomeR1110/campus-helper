import { Bell, BellRing, Smartphone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { PageContainer, TopBar } from "@/components/layout";
import { Card, EmptyState, Skeleton, buttonStyles, cardStyles } from "@/components/ui";
import { getCurrentUser } from "@/features/courses/server";
import { EnablePushButton, MarkAllReadButton } from "@/features/notifications";
import { listForUser } from "@/features/notifications/server";
import { formatRelativeTime } from "@/lib/time";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Notifications" };

/** Reads the session, searchParams or the database per request. */
export const instant = false;

/** PG-13 notification list (NT-AC-02, NT-AC-03). */
async function NotificationList() {
  await connection();
  const user = await getCurrentUser();
  const { items } = await listForUser(user.id);

  if (items.length === 0) {
    return (
      <Card className="p-0">
        <EmptyState
          icon={Bell}
          title="No notifications yet"
          description="You will be reminded here before each class starts."
          action={
            <Link
              href="/courses/new"
              className={buttonStyles({ size: "sm", variant: "secondary" })}
            >
              Add a course
            </Link>
          }
        />
      </Card>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => {
        const unread = !item.readAt;
        return (
          <li key={item.id}>
            <Link
              href={item.href}
              className={cardStyles({
                variant: unread ? "widget" : "default",
                interactive: true,
                className: "flex items-start gap-3 p-3.5",
              })}
            >
              <span
                aria-hidden
                className="relative flex size-11 shrink-0 items-center justify-center rounded-sm bg-event-class-subtle text-event-class"
              >
                <BellRing className="size-5" />
                {unread && (
                  <span className="absolute -top-0.5 -right-0.5 size-3 rounded-full bg-primary ring-2 ring-surface" />
                )}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex items-start justify-between gap-2">
                  <span
                    className={cn(
                      "line-clamp-2 text-subtitle",
                      unread ? "text-text" : "font-medium text-text-muted",
                    )}
                  >
                    {item.title}
                  </span>
                  <span className="shrink-0 pt-0.5 text-caption text-text-muted">
                    {formatRelativeTime(item.createdAt)}
                  </span>
                </span>
                <span className="line-clamp-2 text-body-sm text-text-muted">{item.body}</span>
                {unread && <span className="sr-only">Unread</span>}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function NotificationSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-hidden>
      {[0, 1, 2].map((index) => (
        <Card key={index} className="flex flex-col gap-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-32" />
        </Card>
      ))}
    </div>
  );
}

async function HeaderActions() {
  await connection();
  const user = await getCurrentUser();
  const { unread } = await listForUser(user.id);

  return (
    <>
      <MarkAllReadButton disabled={unread === 0} />
    </>
  );
}

/** Push opt-in (task #30, FR-PWA-03): permission is only asked on press. */
function PushSection() {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-caption tracking-wide text-text-muted uppercase">
        Browser notifications
      </h2>
      <Card className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-primary-subtle text-primary">
          <Smartphone className="size-5" aria-hidden />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <EnablePushButton />
        </div>
      </Card>
    </section>
  );
}

export default function NotificationsPage() {
  return (
    <>
      <TopBar
        title="Notifications"
        backHref="/home"
        actions={
          <Suspense fallback={null}>
            <HeaderActions />
          </Suspense>
        }
      />
      <PageContainer>
        <Suspense fallback={<NotificationSkeleton />}>
          <NotificationList />
        </Suspense>
        <PushSection />
      </PageContainer>
    </>
  );
}
