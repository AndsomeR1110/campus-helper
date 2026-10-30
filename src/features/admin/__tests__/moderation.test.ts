import { beforeEach, describe, expect, it } from "vitest";
import { DEMO_VIEWERS, getPostDetail, HttpError, resetStore } from "@/features/lost-found/server";
import {
  createReport,
  decideReport,
  listAuditLog,
  listReports,
  resetModerationStore,
} from "../server";

function errorCode(run: () => unknown): string {
  try {
    run();
    return "NO_ERROR";
  } catch (error) {
    return error instanceof HttpError ? error.code : "NOT_HTTP_ERROR";
  }
}

beforeEach(() => {
  resetStore();
  resetModerationStore();
});

describe("reporting", () => {
  it("LF-AC-09 lets a student report someone else's post", () => {
    const report = createReport("post-01", { reason: "Looks like spam." }, DEMO_VIEWERS.student);
    expect(report.status).toBe("PENDING");
    expect(report.reporterId).toBe(DEMO_VIEWERS.student.id);
  });

  it("does not let a student report their own post", () => {
    expect(errorCode(() => createReport("post-02", { reason: "test" }, DEMO_VIEWERS.student))).toBe(
      "FORBIDDEN",
    );
  });

  it("rejects an empty reason and a duplicate pending report", () => {
    expect(errorCode(() => createReport("post-01", { reason: "  " }, DEMO_VIEWERS.student))).toBe(
      "VALIDATION_ERROR",
    );
    createReport("post-01", { reason: "Looks like spam." }, DEMO_VIEWERS.student);
    expect(
      errorCode(() => createReport("post-01", { reason: "Still spam." }, DEMO_VIEWERS.student)),
    ).toBe("ALREADY_REPORTED");
  });

  it("keeps the moderation queue private to administrators", () => {
    expect(errorCode(() => listReports(DEMO_VIEWERS.student))).toBe("FORBIDDEN");
    expect(listReports(DEMO_VIEWERS.admin).length).toBeGreaterThan(0);
  });
});

describe("moderation decisions", () => {
  it("LF-AC-09 hiding the reported post resolves the report and writes an audit entry", () => {
    const report = decideReport("report-01", { decision: "HIDE" }, DEMO_VIEWERS.admin);
    expect(report.status).toBe("RESOLVED");

    expect(getPostDetail("post-07", DEMO_VIEWERS.student)).toBeNull();
    expect(getPostDetail("post-07", DEMO_VIEWERS.admin)?.post.status).toBe("HIDDEN");

    const audit = listAuditLog(DEMO_VIEWERS.admin);
    expect(audit[0]?.targetId).toBe("report-01");
    expect(audit[0]?.action).toBe("REPORT_RESOLVED_POST_HIDDEN");
  });

  it("dismissing the report keeps the post visible", () => {
    decideReport("report-01", { decision: "DISMISS" }, DEMO_VIEWERS.admin);
    expect(getPostDetail("post-07", DEMO_VIEWERS.student)?.post.status).toBe("OPEN");
  });

  it("rejects a second decision on the same report", () => {
    decideReport("report-01", { decision: "DISMISS" }, DEMO_VIEWERS.admin);
    expect(
      errorCode(() => decideReport("report-01", { decision: "HIDE" }, DEMO_VIEWERS.admin)),
    ).toBe("REPORT_HANDLED");
  });

  it("rejects a non-admin decision and an unknown decision value", () => {
    expect(
      errorCode(() => decideReport("report-01", { decision: "HIDE" }, DEMO_VIEWERS.student)),
    ).toBe("FORBIDDEN");
    expect(
      errorCode(() => decideReport("report-01", { decision: "DELETE" }, DEMO_VIEWERS.admin)),
    ).toBe("VALIDATION_ERROR");
  });

  it("sorts the queue with the newest report first and resolves the post title", () => {
    const queue = listReports(DEMO_VIEWERS.admin);
    expect(queue[0]?.postTitle).toBe("Scientific calculator");
    expect(Date.parse(queue[0]!.createdAt)).toBeGreaterThan(Date.parse(queue[1]!.createdAt));
  });
});
