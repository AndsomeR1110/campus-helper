import { LostFoundError } from "@/features/lost-found";

import type { AuditEntry, ModerationReport } from "../types";
import type {
  ModerationRepository,
  NewAuditRecord,
  NewReportRecord,
  ReportPatch,
} from "./repository";

interface Seed {
  reports: ModerationReport[];
  audit: AuditEntry[];
}

const SEED: Seed = {
  reports: [
    {
      id: "report-01",
      postId: "post-03",
      postTitle: "AirPods case",
      postKind: "FOUND",
      reporterId: "u-1007",
      reporterName: "Hao Zhang",
      reason: "Looks like the same case that is already posted by someone else.",
      status: "PENDING",
      createdAt: "2026-11-03T09:15:00.000Z",
      resolvedAt: null,
      handledByName: null,
    },
    {
      id: "report-02",
      postId: "post-01",
      postTitle: "Blue water bottle",
      postKind: "FOUND",
      reporterId: "u-1003",
      reporterName: "Lin Sun",
      reason: "The description mentions a sticker that is not there.",
      status: "DISMISSED",
      createdAt: "2026-10-31T11:40:00.000Z",
      resolvedAt: "2026-11-01T08:05:00.000Z",
      handledByName: "Duty Officer",
    },
  ],
  audit: [
    {
      id: "audit-01",
      actorId: "u-9001",
      actorName: "Duty Officer",
      action: "REPORT_DISMISSED",
      targetType: "REPORT",
      targetId: "report-02",
      note: "The sticker is described in the photo.",
      createdAt: "2026-11-01T08:05:00.000Z",
    },
  ],
};

/** Demo storage. The Prisma repository replaces it once a database is configured. */
export function createMemoryModerationRepository(seed: Seed = SEED): ModerationRepository {
  const reports = seed.reports.map((report) => ({ ...report }));
  const audit = seed.audit.map((entry) => ({ ...entry }));

  function find(id: string): ModerationReport | undefined {
    return reports.find((report) => report.id === id);
  }

  return {
    async listReports(status) {
      return reports
        .filter((report) => report.status === status)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },

    async getReport(id) {
      return find(id) ?? null;
    },

    async createReport(record: NewReportRecord) {
      const duplicate = reports.some(
        (report) =>
          report.postId === record.postId &&
          report.reporterId === record.reporter.id &&
          report.status === "PENDING",
      );
      if (duplicate) {
        throw new LostFoundError("CONFLICT", "You have already reported this post.");
      }
      const report: ModerationReport = {
        id: record.id,
        postId: record.postId,
        postTitle: record.postTitle,
        postKind: record.postKind,
        reporterId: record.reporter.id,
        reporterName: record.reporter.name,
        reason: record.reason,
        status: "PENDING",
        createdAt: record.createdAt,
        resolvedAt: null,
        handledByName: null,
      };
      reports.push(report);
      return report;
    },

    async updateReport(id, patch: ReportPatch) {
      const report = find(id);
      if (!report) throw new LostFoundError("NOT_FOUND", "This report no longer exists.");
      Object.assign(report, patch);
      return { ...report };
    },

    async listAudit(limit) {
      return [...audit].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
    },

    async createAudit(record: NewAuditRecord) {
      const entry: AuditEntry = {
        id: record.id,
        actorId: record.actor.id,
        actorName: record.actor.name,
        action: record.action,
        targetType: record.targetType,
        targetId: record.targetId,
        note: record.note,
        createdAt: record.createdAt,
      };
      audit.push(entry);
      return entry;
    },
  };
}
