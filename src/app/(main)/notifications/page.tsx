import { Bell } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { PageContainer, TopBar } from "@/components/layout";
import { Card, EmptyState, ListItem, Skeleton, buttonStyles } from "@/components/ui";
import { getCurrentUser } from "@/features/courses/server";
import { EnablePushButton, MarkAllReadButton } from "@/features/notifications";
import { listForUser } from "@/features/notifications/server";
import { formatRelativeTime } from "@/lib/time";

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
      {items.map((item) => (
        <li key={item.id}>
          <Link href={item.href} className="block">
            <Card className="p-4">
              <ListItem
                leading={
                  <span
                    aria-hidden
                    className={
                      item.readAt
                        ? "size-2 rounded-full bg-border-strong"
                        : "size-2 rounded-full bg-primary"
                    }
                  />
                }
                title={item.title}
                description={`${item.body} 路 ${formatRelativeTime(item.createdAt)}`}
              />
            </Card>
          </Link>
        </li>
      ))}
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
      {unread > 0 && (
        <span className="mr-2 text-body-sm text-text-muted tabular-nums">{unread} unread</span>
      )}
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
      <EnablePushButton />
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
