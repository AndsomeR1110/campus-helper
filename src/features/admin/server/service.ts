import { LostFoundError } from "@/features/lost-found";
import type { Viewer } from "@/features/lost-found";
import type { LostFoundService } from "@/features/lost-found/server";

import { AUDIT_ACTIONS } from "../types";
import type { AuditEntry, ModerationReport, NewReportInput, ReportDecision } from "../types";
import { canDecideReport, canReportPost, requireModerator, requireReporter } from "../rules";
import type { ModerationRepository } from "./repository";

export interface ModerationServiceDeps {
  repository: ModerationRepository;
  /** Used to check who wrote a post and to hide it, never to read claims. */
  lostFound: LostFoundService;
  currentViewer: () => Promise<Viewer | null>;
  /** The actor the session adapter reports; the role check happens in `rules`. */
  currentActor: () => Promise<Viewer | null>;
  now: () => Date;
  nextId: () => string;
}

export function createModerationService({
  repository,
  lostFound,
  currentViewer,
  currentActor,
  now,
  nextId,
}: ModerationServiceDeps) {
  return {
    /** Any signed-in student can report a post; the author cannot report their own. */
    async createReport(postId: string, input: NewReportInput): Promise<ModerationReport> {
      const viewer = requireReporter(await currentViewer());
      const post = await lostFound.getPostSummary(postId);
      if (!post) throw new LostFoundError("NOT_FOUND", "This post does not exist.");

      const verdict = canReportPost(viewer, post);
      if (!verdict.allowed) throw new LostFoundError("FORBIDDEN", verdict.reason);

      return repository.createReport({
        id: nextId(),
        postId: post.id,
        postTitle: post.title,
        postKind: post.kind,
        reporter: viewer,
        reason: input.reason,
        createdAt: now().toISOString(),
      });
    },

    /** The whole admin page in one call: queue, handled reports and the audit trail. */
    async listModeration(): Promise<{
      pending: ModerationReport[];
      history: ModerationReport[];
      audit: AuditEntry[];
    }> {
      requireModerator(await currentActor());
      const [pending, resolved, dismissed, audit] = await Promise.all([
        repository.listReports("PENDING"),
        repository.listReports("RESOLVED"),
        repository.listReports("DISMISSED"),
        repository.listAudit(20),
      ]);
      const history = [...resolved, ...dismissed].sort((a, b) =>
        (b.resolvedAt ?? b.createdAt).localeCompare(a.resolvedAt ?? a.createdAt),
      );
      return { pending, history, audit };
    },

    /** LF-AC-09: hiding the post and closing the report happen together, then get audited. */
    async decideReport(reportId: string, decision: ReportDecision): Promise<ModerationReport> {
      const admin = requireModerator(await currentActor());
      const report = await repository.getReport(reportId);
      if (!report) throw new LostFoundError("NOT_FOUND", "This report no longer exists.");
      if (!canDecideReport(report.status)) {
        throw new LostFoundError("CONFLICT", "This report has already been handled.");
      }

      if (decision === "HIDE") {
        await lostFound.hidePostAsModerator(report.postId);
      }

      const at = now().toISOString();
      const updated = await repository.updateReport(reportId, {
        status: decision === "HIDE" ? "RESOLVED" : "DISMISSED",
        resolvedAt: at,
        handledById: admin.id,
        handledByName: admin.name,
      });

      await repository.createAudit({
        id: nextId(),
        actor: admin,
        action: AUDIT_ACTIONS[decision],
        targetType: "REPORT",
        targetId: reportId,
        note:
          decision === "HIDE"
            ? `Post "${report.postTitle}" hidden after review.`
            : `Report on "${report.postTitle}" dismissed.`,
        createdAt: at,
      });

      return updated;
    },
  };
}

export type ModerationService = ReturnType<typeof createModerationService>;
