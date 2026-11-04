import type { PostKind, Viewer } from "@/features/lost-found";

import type { AuditEntry, ModerationReport, ReportStatus } from "../types";

export interface ReportPatch {
  status?: ReportStatus;
  resolvedAt?: string | null;
  handledById?: string | null;
  handledByName?: string | null;
}

export interface NewReportRecord {
  id: string;
  postId: string;
  postTitle: string;
  postKind: PostKind;
  reporter: Viewer;
  reason: string;
  createdAt: string;
}

export interface NewAuditRecord {
  id: string;
  actor: Viewer;
  action: string;
  targetType: AuditEntry["targetType"];
  targetId: string;
  note: string | null;
  createdAt: string;
}

/**
 * Storage contract for moderation. `listReports("PENDING")` is the queue, any
 * other status is the history; both carry the post title so the queue renders
 * without a second query.
 */
export interface ModerationRepository {
  listReports(status: ReportStatus): Promise<ModerationReport[]>;
  getReport(id: string): Promise<ModerationReport | null>;
  createReport(record: NewReportRecord): Promise<ModerationReport>;
  updateReport(id: string, patch: ReportPatch): Promise<ModerationReport>;
  listAudit(limit: number): Promise<AuditEntry[]>;
  createAudit(record: NewAuditRecord): Promise<AuditEntry>;
}
