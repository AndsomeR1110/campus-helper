/**
 * In-memory moderation store (reports + audit trail).
 *
 * Same trade-off as the lost-found store: Prisma does not exist on `main` yet,
 * so the queue and the audit log live in module state with fictional seed rows.
 * Swap for Prisma models in the same PR that adds them; nothing outside
 * `admin/server/service.ts` touches this file.
 */
import type { LostFoundReport } from "@/features/lost-found";
import type { AuditEntry } from "../moderation";

export interface ModerationStore {
  reports: LostFoundReport[];
  audit: AuditEntry[];
}

function seedReports(): LostFoundReport[] {
  return [
    {
      id: "report-01",
      postId: "post-07",
      reporterId: "u-1004",
      reporterName: "Hao Zhang",
      reason: "Looks like the same calculator that is already posted by someone else.",
      status: "PENDING",
      createdAt: "2026-11-04T06:15:00.000Z",
      resolvedAt: null,
    },
    {
      id: "report-02",
      postId: "post-02",
      reporterId: "u-1005",
      reporterName: "Yuki Sato",
      reason: "Wrong category — this is not a campus card.",
      status: "DISMISSED",
      createdAt: "2026-11-03T02:00:00.000Z",
      resolvedAt: "2026-10-24T05:30:00.000Z",
    },
  ];
}

function seedAudit(): AuditEntry[] {
  return [
    {
      id: "audit-01",
      actorId: "u-9001",
      actorName: "Duty Officer",
      action: "REPORT_DISMISSED",
      targetType: "REPORT",
      targetId: "report-02",
      note: "Category was fixed by the author.",
      createdAt: "2026-10-24T05:30:00.000Z",
    },
  ];
}

function createStore(): ModerationStore {
  return { reports: seedReports(), audit: seedAudit() };
}

export const store: ModerationStore = createStore();

export function resetModerationStore(): void {
  const fresh = createStore();
  store.reports.splice(0, store.reports.length, ...fresh.reports);
  store.audit.splice(0, store.audit.length, ...fresh.audit);
}

let sequence = 0;

export function nextAdminId(prefix: "report" | "audit"): string {
  sequence += 1;
  return `${prefix}-new-${sequence}`;
}
