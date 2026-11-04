import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { EmptyState, Skeleton, StatusBadge, TypeTag } from "@/components/ui";
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

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3" aria-label="Reported posts">
        <h2 className="text-subtitle">Reported posts</h2>
        <p className="text-body-sm text-text-muted">
          {pending.length === 0
            ? "Nothing is waiting for review."
            : `${pending.length} report${pending.length === 1 ? "" : "s"} waiting for review.`}
        </p>

        {pending.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="All clear"
            description="Reported posts show up here. Nothing is waiting right now."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {pending.map((report) => (
              <li key={report.id}>
                <article className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <TypeTag type={report.postKind === "LOST" ? "lost" : "found"} />
                    <StatusBadge kind="report" status={report.status} />
                    <span className="text-caption text-text-muted">
                      reported by {formatDisplayName(report.reporterName)} ·{" "}
                      {formatDate(new Date(report.createdAt))}{" "}
                      {formatTime(new Date(report.createdAt))}
                    </span>
                  </div>
                  <h3 className="text-subtitle">{report.postTitle}</h3>
                  <p className="text-body-sm text-text-muted">{report.reason}</p>
                  <ReportActions report={report} />
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3" aria-label="Handled reports">
        <h2 className="text-subtitle">Handled reports</h2>
        {history.length === 0 ? (
          <p className="text-body-sm text-text-muted">No report has been handled yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {history.map((report) => (
              <li
                key={report.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-surface p-3"
              >
                <span className="text-body-sm">{report.postTitle}</span>
                <span className="flex items-center gap-3">
                  <span className="text-caption text-text-muted">
                    {report.handledByName ? `by ${formatDisplayName(report.handledByName)}` : null}
                  </span>
                  <StatusBadge kind="report" status={report.status} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3" aria-label="Administrator activity">
        <h2 className="text-subtitle">Administrator activity</h2>
        {audit.length === 0 ? (
          <p className="text-body-sm text-text-muted">No administrative action recorded yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {audit.map((entry) => (
              <li key={entry.id} className="rounded-md border border-border bg-surface p-3">
                <p className="text-body-sm">{entry.note ?? entry.action}</p>
                <p className="text-caption text-text-muted">
                  {formatDisplayName(entry.actorName)} · {entry.action} ·{" "}
                  {formatDate(new Date(entry.createdAt))} {formatTime(new Date(entry.createdAt))}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
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
