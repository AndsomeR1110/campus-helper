import type { Prisma, PrismaClient } from "@prisma/client";

import { LostFoundError } from "@/features/lost-found";

import type { AuditEntry, ModerationReport, ReportStatus } from "../types";
import type {
  ModerationRepository,
  NewAuditRecord,
  NewReportRecord,
  ReportPatch,
} from "./repository";

const reportInclude = {
  post: { select: { title: true, kind: true } },
  reporter: { select: { name: true } },
  handledBy: { select: { name: true } },
} satisfies Prisma.ReportInclude;

const auditInclude = {
  actor: { select: { name: true } },
} satisfies Prisma.AuditLogInclude;

type ReportRow = Prisma.ReportGetPayload<{ include: typeof reportInclude }>;
type AuditRow = Prisma.AuditLogGetPayload<{ include: typeof auditInclude }>;

function toReport(row: ReportRow): ModerationReport {
  return {
    id: row.id,
    postId: row.postId,
    postTitle: row.post.title,
    postKind: row.post.kind,
    reporterId: row.reporterId,
    reporterName: row.reporter.name,
    reason: row.reason,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    handledByName: row.handledBy?.name ?? null,
  };
}

function toAudit(row: AuditRow): AuditEntry {
  return {
    id: row.id,
    actorId: row.actorId,
    actorName: row.actor.name,
    action: row.action,
    targetType: row.targetType === "REPORT" ? "REPORT" : "POST",
    targetId: row.targetId,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Prisma storage for the moderation queue and the audit trail. */
export function createPrismaModerationRepository(client: PrismaClient): ModerationRepository {
  return {
    async listReports(status: ReportStatus) {
      const rows = await client.report.findMany({
        where: { status },
        orderBy: { createdAt: "desc" },
        include: reportInclude,
      });
      return rows.map(toReport);
    },

    async getReport(id) {
      const row = await client.report.findUnique({ where: { id }, include: reportInclude });
      return row ? toReport(row) : null;
    },

    async createReport(record: NewReportRecord) {
      try {
        const row = await client.report.create({
          data: {
            id: record.id,
            postId: record.postId,
            reporterId: record.reporter.id,
            reason: record.reason,
            createdAt: new Date(record.createdAt),
          },
          include: reportInclude,
        });
        return toReport(row);
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === "P2002"
        ) {
          throw new LostFoundError("CONFLICT", "You have already reported this post.");
        }
        throw error;
      }
    },

    async updateReport(id, patch: ReportPatch) {
      const data: Prisma.ReportUpdateInput = {};
      if (patch.status) data.status = patch.status;
      if (patch.resolvedAt !== undefined) {
        data.resolvedAt = patch.resolvedAt ? new Date(patch.resolvedAt) : null;
      }
      if (patch.handledById !== undefined) {
        data.handledBy = patch.handledById
          ? { connect: { id: patch.handledById } }
          : { disconnect: true };
      }
      const row = await client.report.update({ where: { id }, data, include: reportInclude });
      return toReport(row);
    },

    async listAudit(limit) {
      const rows = await client.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
        include: auditInclude,
      });
      return rows.map(toAudit);
    },

    async createAudit(record: NewAuditRecord) {
      const row = await client.auditLog.create({
        data: {
          id: record.id,
          actorId: record.actor.id,
          action: record.action,
          targetType: record.targetType,
          targetId: record.targetId,
          note: record.note,
          createdAt: new Date(record.createdAt),
        },
        include: auditInclude,
      });
      return toAudit(row);
    },
  };
}
