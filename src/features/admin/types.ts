import type { PostKind } from "@/features/lost-found";

export type ReportDecision = "HIDE" | "DISMISS";
export type ReportStatus = "PENDING" | "RESOLVED" | "DISMISSED";

export interface ModerationReport {
  id: string;
  postId: string;
  postTitle: string;
  postKind: PostKind;
  reporterId: string;
  reporterName: string;
  reason: string;
  status: ReportStatus;
  createdAt: string;
  resolvedAt: string | null;
  handledByName: string | null;
}

export interface AuditEntry {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  targetType: "POST" | "REPORT";
  targetId: string;
  note: string | null;
  createdAt: string;
}

export interface NewReportInput {
  reason: string;
}

export const AUDIT_ACTIONS = {
  HIDE: "REPORT_RESOLVED_POST_HIDDEN",
  DISMISS: "REPORT_DISMISSED",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];
