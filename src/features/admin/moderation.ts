/**
 * Admin moderation domain (FR-LF-08, LF-AC-09).
 *
 * Types and pure rules live here so they can be unit-tested and imported by
 * client code; anything that touches the store lives in `server/`.
 */
import type { LostFoundReport, PostKind, Viewer } from "@/features/lost-found";

/** What an administrator can do with a report. */
export type ReportDecision = "HIDE" | "DISMISS";

/** A report with just enough post context for the queue. */
export interface ModerationReport extends LostFoundReport {
  readonly postTitle: string;
  readonly postKind: PostKind;
}

export type AuditTarget = "POST" | "REPORT";

/** One administrator action (PRD FR-AD-04). */
export interface AuditEntry {
  readonly id: string;
  readonly actorId: string;
  readonly actorName: string;
  readonly action: string;
  readonly targetType: AuditTarget;
  readonly targetId: string;
  readonly note: string;
  readonly createdAt: string;
}

export type ModerateResult =
  { ok: true } | { ok: false; code: "FORBIDDEN" | "CONFLICT"; message: string };

/** Only administrators may decide a report, and only while it is pending. */
export function canDecideReport(
  report: { status: LostFoundReport["status"] },
  viewer: Viewer,
): ModerateResult {
  if (viewer.role !== "ADMIN") {
    return { ok: false, code: "FORBIDDEN", message: "Only administrators can moderate posts." };
  }
  if (report.status !== "PENDING") {
    return { ok: false, code: "CONFLICT", message: "This report has already been handled." };
  }
  return { ok: true };
}

/** The audit action string recorded for each decision. */
export function auditActionFor(decision: ReportDecision): string {
  return decision === "HIDE" ? "REPORT_RESOLVED_POST_HIDDEN" : "REPORT_DISMISSED";
}
