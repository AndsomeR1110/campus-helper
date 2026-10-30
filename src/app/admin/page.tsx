import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import {
  buttonStyles,
  cardStyles,
  DemoDataNotice,
  EmptyState,
  StatusBadge,
  TypeTag,
} from "@/components/ui";
import { ReportActions } from "@/features/admin";
import { formatDisplayName } from "@/features/lost-found";
import { requireAdmin } from "@/features/lost-found/server";
import { formatDate, formatTime } from "@/lib/time";
import { listAuditLog, listReports } from "@/features/admin/server";

export const metadata: Metadata = {
  title: "Administration · Campus Helper",
};

/** PG-19 — moderation queue and administrator activity (FR-LF-08, LF-AC-09). */
export default function AdminPage() {
  const viewer = requireAdmin();
  const reports = listReports(viewer);
  const pending = reports.filter((report) => report.status === "PENDING");
  const decided = reports.filter((report) => report.status !== "PENDING");
  const audit = listAuditLog(viewer, 10);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h1 className="text-title text-text">Reported posts</h1>
        <p className="text-body-sm text-text-muted">
          {pending.length === 0
            ? "Nothing is waiting for review."
            : `${pending.length} report${pending.length === 1 ? "" : "s"} waiting for review.`}
        </p>

        {pending.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="Queue is clear"
            description="Reported posts appear here for review."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {pending.map((report) => (
              <li key={report.id} className={cardStyles()}>
                <div className="flex flex-wrap items-center gap-2">
                  <TypeTag type={report.postKind === "LOST" ? "lost" : "found"} />
                  <StatusBadge kind="report" status={report.status} />
                  <span className="text-caption text-text-muted">
                    reported by {formatDisplayName(report.reporterName)} ·{" "}
                    {formatDate(report.createdAt)} {formatTime(report.createdAt)}
                  </span>
                </div>
                <h2 className="mt-2 text-subtitle text-text">{report.postTitle}</h2>
                <p className="mt-1 text-body-sm text-text">{report.reason}</p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <ReportActions reportId={report.id} postTitle={report.postTitle} />
                  <Link
                    href={`/lost-found/${report.postId}`}
                    className={buttonStyles({ variant: "ghost", size: "sm" })}
                  >
                    Open post
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {decided.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-subtitle text-text">Handled reports</h2>
          <ul className="flex flex-col gap-2">
            {decided.map((report) => (
              <li
                key={report.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-4 py-3"
              >
                <span className="text-body-sm text-text">{report.postTitle}</span>
                <StatusBadge kind="report" status={report.status} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-subtitle text-text">Administrator activity</h2>
        {audit.length === 0 ? (
          <p className="text-body-sm text-text-muted">No recorded actions yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {audit.map((entry) => (
              <li key={entry.id} className="rounded-md border border-border bg-surface px-4 py-3">
                <p className="text-body-sm text-text">{entry.note}</p>
                <p className="mt-1 text-caption text-text-muted">
                  {entry.actorName} · {entry.action} · {formatDate(entry.createdAt)}{" "}
                  {formatTime(entry.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <DemoDataNotice variant="footer" />
    </div>
  );
}
