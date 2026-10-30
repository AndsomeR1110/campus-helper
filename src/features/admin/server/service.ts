/**
 * Moderation service (FR-LF-08, FR-AD-04, LF-AC-09).
 *
 * Reports belong to the admin module, but they are created from the Lost &
 * Found detail page. The two modules talk through their public server entries:
 * admin calls `hidePost()` and `getPostForModeration()` from lost-found.
 */
import type { LostFoundReport, Viewer } from "@/features/lost-found";
import { validateReportInput } from "@/features/lost-found";
import {
  conflict,
  forbidden,
  getPostForModeration,
  getPostSummary,
  hidePost,
  notFound,
  requirePost,
  validationError,
} from "@/features/lost-found/server";
import {
  auditActionFor,
  canDecideReport,
  type AuditEntry,
  type ModerationReport,
  type ReportDecision,
} from "../moderation";
import { nextAdminId, store } from "./store";

function requireAdmin(viewer: Viewer): void {
  if (viewer.role !== "ADMIN") throw forbidden("Only administrators can moderate posts.");
}

function sortNewest<T extends { createdAt: string }>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

/** Any signed-in user except the author can report a post (LF-AC-09). */
export function createReport(postId: unknown, input: unknown, viewer: Viewer): LostFoundReport {
  if (typeof postId !== "string" || postId.trim() === "") {
    throw validationError({ postId: "Choose a post to report." });
  }
  const post = requirePost(postId);
  if (post.authorId === viewer.id) throw forbidden("You cannot report your own post.");

  const parsed = validateReportInput(input);
  if (!parsed.ok) throw validationError(parsed.errors);

  const alreadyReported = store.reports.some(
    (report) =>
      report.postId === postId && report.reporterId === viewer.id && report.status === "PENDING",
  );
  if (alreadyReported) throw conflict("ALREADY_REPORTED", "You have already reported this post.");

  const report: LostFoundReport = {
    id: nextAdminId("report"),
    postId,
    reporterId: viewer.id,
    reporterName: viewer.name,
    reason: parsed.value.reason,
    status: "PENDING",
    createdAt: new Date().toISOString(),
    resolvedAt: null,
  };
  store.reports.unshift(report);
  return report;
}

/** The queue shown on PG-19. Newest pending report first. */
export function listReports(viewer: Viewer): ModerationReport[] {
  requireAdmin(viewer);
  return sortNewest(store.reports).map((report) => {
    const summary = getPostSummary(report.postId);
    return {
      ...report,
      postTitle: summary?.title ?? "Removed post",
      postKind: summary?.kind ?? "LOST",
    };
  });
}

/** Hiding the post resolves the report; dismissing it keeps the post visible. */
export function decideReport(reportId: string, input: unknown, viewer: Viewer): LostFoundReport {
  const decision = (input as { decision?: unknown } | null)?.decision;
  if (decision !== "HIDE" && decision !== "DISMISS") {
    throw validationError({ decision: "Choose whether to hide the post or dismiss the report." });
  }

  const report = store.reports.find((candidate) => candidate.id === reportId);
  if (!report) throw notFound("This report is no longer available.");

  const allowed = canDecideReport(report, viewer);
  if (!allowed.ok) {
    throw allowed.code === "FORBIDDEN"
      ? forbidden(allowed.message)
      : conflict("REPORT_HANDLED", allowed.message);
  }

  const type: ReportDecision = decision;
  if (type === "HIDE") {
    const post = getPostForModeration(report.postId, viewer);
    if (post && post.status !== "HIDDEN") hidePost(post.id, viewer);
  }

  const now = new Date().toISOString();
  const index = store.reports.findIndex((candidate) => candidate.id === report.id);
  const updated: LostFoundReport = {
    ...report,
    status: type === "HIDE" ? "RESOLVED" : "DISMISSED",
    resolvedAt: now,
  };
  store.reports[index] = updated;

  recordAudit({
    actor: viewer,
    action: auditActionFor(type),
    targetType: "REPORT",
    targetId: report.id,
    note: `${type === "HIDE" ? "Hidden" : "Kept"} “${getPostSummary(report.postId)?.title ?? "post"}” (report ${report.id}).`,
    createdAt: now,
  });

  return updated;
}

function recordAudit(entry: {
  actor: Viewer;
  action: string;
  targetType: AuditEntry["targetType"];
  targetId: string;
  note: string;
  createdAt: string;
}): AuditEntry {
  const row: AuditEntry = {
    id: nextAdminId("audit"),
    actorId: entry.actor.id,
    actorName: entry.actor.name,
    action: entry.action,
    targetType: entry.targetType,
    targetId: entry.targetId,
    note: entry.note,
    createdAt: entry.createdAt,
  };
  store.audit.unshift(row);
  return row;
}

/** Newest administrator action first, capped for the dashboard. */
export function listAuditLog(viewer: Viewer, limit = 20): AuditEntry[] {
  requireAdmin(viewer);
  return sortNewest(store.audit).slice(0, limit);
}
