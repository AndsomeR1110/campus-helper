import { EyeOff, Flag, History, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import {
  Card,
  EmptyState,
  Skeleton,
  StatusBadge,
  TypeIcon,
  TypeTag,
  cardStyles,
  typeColorClasses,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import { ReportActions } from "@/features/admin";
import { getModerationRuntime } from "@/features/admin/server";
import { formatDisplayName } from "@/features/lost-found";
import { formatDate, formatTime } from "@/lib/time";

export const metadata: Metadata = { title: "Administration" };

function QueueSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      {[0, 1].map((key) => (
        <Skeleton key={key} className="h-40 w-full" />
      ))}
    </div>
  );
}

async function ModerationQueue() {
  await connection();
  const { service } = getModerationRuntime();
  const { pending, history, audit } = await service.listModeration();

  const hidden = history.filter((r) => r.status === "RESOLVED").length;
  const stats = [
    {
      label: "Waiting for review",
      value: pending.length,
      tone: "bg-warning-subtle text-warning",
      icon: Flag,
    },
    { label: "Posts hidden", value: hidden, tone: "bg-danger-subtle text-danger", icon: EyeOff },
    {
      label: "Admin actions",
      value: audit.length,
      tone: "bg-info-subtle text-info",
      icon: History,
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <dl className="grid grid-cols-3 gap-2 md:gap-3">
        {stats.map(({ label, value, tone, icon: Icon }) => (
          <div
            key={label}
            className={cardStyles({
              variant: "widget",
              className: "flex flex-col items-start gap-2 p-3 md:p-4",
            })}
          >
            <span className={cn("flex size-9 items-center justify-center rounded-sm", tone)}>
              <Icon className="size-5" aria-hidden />
            </span>
            <dd className="text-title-lg text-text tabular-nums">{value}</dd>
            <dt className="text-caption text-text-muted">{label}</dt>
          </div>
        ))}
      </dl>

      <section className="flex flex-col gap-3" aria-labelledby="admin-reported">
        <SectionTitle id="admin-reported">Reported posts</SectionTitle>

        {pending.length === 0 ? (
          <Card variant="widget" className="p-0">
            <EmptyState
              icon={ShieldCheck}
              title="All clear"
              description="Reported posts show up here. Nothing is waiting right now."
            />
          </Card>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {pending.map((report) => (
              <li key={report.id}>
                <article className={cardStyles({ className: "flex h-full flex-col gap-3" })}>
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden
                      className={cn(
                        "flex size-11 shrink-0 items-center justify-center rounded-sm",
                        typeColorClasses(report.postKind === "LOST" ? "lost" : "found"),
                      )}
                    >
                      <TypeIcon
                        type={report.postKind === "LOST" ? "lost" : "found"}
                        className="size-5"
                      />
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <TypeTag type={report.postKind === "LOST" ? "lost" : "found"} />
                        <StatusBadge kind="report" status={report.status} />
                      </div>
                      <h3 className="text-subtitle">{report.postTitle}</h3>
                      <p className="text-caption text-text-muted">
                        Reported by {formatDisplayName(report.reporterName)} ·{" "}
                        {formatDate(new Date(report.createdAt))}{" "}
                        {formatTime(new Date(report.createdAt))}
                      </p>
                    </div>
                  </div>
                  <blockquote className="rounded-sm border-l-4 border-warning bg-warning-subtle/60 px-3 py-2 text-body-sm text-text">
                    {report.reason}
                  </blockquote>
                  <div className="mt-auto">
                    <ReportActions report={report} />
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-8 md:grid-cols-2">
        <section className="flex flex-col gap-3" aria-labelledby="admin-handled">
          <SectionTitle id="admin-handled">Handled reports</SectionTitle>
          {history.length === 0 ? (
            <p className="text-body-sm text-text-muted">No report has been handled yet.</p>
          ) : (
            <ul className={cardStyles({ className: "divide-y divide-border p-0" })}>
              {history.map((report) => (
                <li key={report.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-body-sm font-medium">{report.postTitle}</span>
                    {report.handledByName ? (
                      <span className="text-caption text-text-muted">
                        by {formatDisplayName(report.handledByName)}
                      </span>
                    ) : null}
                  </span>
                  <StatusBadge kind="report" status={report.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-3" aria-labelledby="admin-activity">
          <SectionTitle id="admin-activity">Administrator activity</SectionTitle>
          {audit.length === 0 ? (
            <p className="text-body-sm text-text-muted">No administrative action recorded yet.</p>
          ) : (
            <ol className="relative flex flex-col gap-3 pl-5 before:absolute before:top-1.5 before:bottom-1.5 before:left-1.5 before:w-px before:bg-border-strong">
              {audit.map((entry) => (
                <li key={entry.id} className="relative">
                  <span
                    aria-hidden
                    className="absolute top-1.5 -left-5 size-3 rounded-full bg-primary ring-4 ring-background"
                  />
                  <p className="text-body-sm">{entry.note ?? entry.action}</p>
                  <p className="text-caption text-text-muted">
                    {formatDisplayName(entry.actorName)} · {humanizeAction(entry.action)} ·{" "}
                    {formatDate(new Date(entry.createdAt))} {formatTime(new Date(entry.createdAt))}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}

/** "REPORT_DISMISSED" → "Report dismissed" */
function humanizeAction(action: string) {
  const text = action.toLowerCase().replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function SectionTitle({ id, children }: { id: string; children: string }) {
  return (
    <h2 id={id} className="text-caption tracking-wide text-text-muted uppercase">
      {children}
    </h2>
  );
}

/** PG-19. */
export default function AdminPage() {
  return (
    <Suspense fallback={<QueueSkeleton />}>
      <ModerationQueue />
    </Suspense>
  );
}
