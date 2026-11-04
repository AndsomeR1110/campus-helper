import { describe, expect, it } from "vitest";

import { DEMO_POSTS } from "../../lost-found/demo-data";
import { createMemoryRepository } from "../../lost-found/server/memory-repository";
import { createLostFoundService } from "../../lost-found/server/service";
import type { LostFoundPost, Viewer } from "../../lost-found/types";
import { createMemoryModerationRepository } from "../server/memory-repository";
import { createModerationService } from "../server/service";
import type { ModerationReport } from "../types";

const NOW = new Date("2026-11-04T08:00:00.000Z");

const wei: Viewer = { id: "u-1001", role: "STUDENT", name: "Wei Chen" };
const mei: Viewer = { id: "u-1002", role: "STUDENT", name: "Mei Lin" };
const admin: Viewer = { id: "u-9001", role: "ADMIN", name: "Duty Officer" };

function report(overrides: Partial<ModerationReport> = {}): ModerationReport {
  return {
    id: "report-01",
    postId: "post-01",
    postTitle: "Blue water bottle",
    postKind: "FOUND",
    reporterId: "u-1007",
    reporterName: "Hao Zhang",
    reason: "Looks like a duplicate of another post.",
    status: "PENDING",
    createdAt: "2026-11-03T09:15:00.000Z",
    resolvedAt: null,
    handledByName: null,
    ...overrides,
  };
}

function makeHarness(seed: ModerationReport[] = [report()], viewer: Viewer | null = wei) {
  let current = viewer;
  let sequence = 0;

  const posts = createMemoryRepository({ posts: DEMO_POSTS as LostFoundPost[] });
  const lostFound = createLostFoundService({
    repository: posts,
    currentViewer: async () => current,
    now: () => NOW,
    nextId: () => `id-${++sequence}`,
  });

  const repository = createMemoryModerationRepository({ reports: seed, audit: [] });
  const service = createModerationService({
    repository,
    lostFound,
    currentViewer: async () => current,
    currentActor: async () => current,
    now: () => NOW,
    nextId: () => `id-${++sequence}`,
  });

  return {
    service,
    posts,
    repository,
    as(next: Viewer | null) {
      current = next;
    },
  };
}

function errorCode(run: () => Promise<unknown>): Promise<string> {
  return run().then(
    () => "NO_ERROR",
    (error: unknown) =>
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code: unknown }).code)
        : "UNKNOWN",
  );
}

describe("moderation access", () => {
  it("LF-AC-09: an anonymous visitor cannot read the queue", async () => {
    const harness = makeHarness([report()], null);
    expect(await errorCode(() => harness.service.listModeration())).toBe("UNAUTHENTICATED");
  });

  it("LF-AC-09: a student cannot read or decide reports", async () => {
    const harness = makeHarness();
    expect(await errorCode(() => harness.service.listModeration())).toBe("FORBIDDEN");
    expect(await errorCode(() => harness.service.decideReport("report-01", "HIDE"))).toBe(
      "FORBIDDEN",
    );
  });

  it("LF-AC-09: the administrator sees the pending queue and the audit trail", async () => {
    const harness = makeHarness([
      report(),
      report({ id: "report-02", status: "DISMISSED", resolvedAt: NOW.toISOString() }),
    ]);
    harness.as(admin);

    const { pending, history, audit } = await harness.service.listModeration();
    expect(pending.map((item) => item.id)).toEqual(["report-01"]);
    expect(history.map((item) => item.id)).toEqual(["report-02"]);
    expect(audit).toEqual([]);
  });
});

describe("reporting a post", () => {
  it("LF-AC-09: a student reports someone else's post", async () => {
    const harness = makeHarness([], wei);
    const created = await harness.service.createReport("post-01", { reason: "Looks duplicated." });

    expect(created.status).toBe("PENDING");
    expect(created.postTitle).toBe("Blue water bottle");
    expect(created.reporterName).toBe("Wei Chen");
  });

  it("LF-AC-09: the author cannot report their own post", async () => {
    const harness = makeHarness([], mei);
    expect(
      await errorCode(() => harness.service.createReport("post-01", { reason: "Test." })),
    ).toBe("FORBIDDEN");
  });

  it("LF-AC-09: reporting a post twice is a conflict, not a second row", async () => {
    const harness = makeHarness([], wei);
    await harness.service.createReport("post-01", { reason: "Looks duplicated." });
    expect(
      await errorCode(() =>
        harness.service.createReport("post-01", { reason: "Still duplicated." }),
      ),
    ).toBe("CONFLICT");
  });

  it("reporting a post that does not exist returns NOT_FOUND", async () => {
    const harness = makeHarness([], wei);
    expect(
      await errorCode(() => harness.service.createReport("post-99", { reason: "Gone." })),
    ).toBe("NOT_FOUND");
  });
});

describe("deciding a report", () => {
  it("LF-AC-09: hiding removes the post from the list and writes an audit entry", async () => {
    const harness = makeHarness();
    harness.as(admin);

    const decided = await harness.service.decideReport("report-01", "HIDE");
    expect(decided.status).toBe("RESOLVED");
    expect(decided.handledByName).toBe("Duty Officer");

    const hidden = await harness.posts.getPost("post-01");
    expect(hidden?.status).toBe("HIDDEN");

    const listed = await harness.service.listModeration();
    expect(listed.history[0]?.id).toBe("report-01");
    expect(listed.audit[0]?.action).toBe("REPORT_RESOLVED_POST_HIDDEN");
    expect(listed.audit[0]?.actorName).toBe("Duty Officer");
  });

  it("LF-AC-09: dismissing keeps the post visible", async () => {
    const harness = makeHarness();
    harness.as(admin);

    const decided = await harness.service.decideReport("report-01", "DISMISS");
    expect(decided.status).toBe("DISMISSED");

    const post = await harness.posts.getPost("post-01");
    expect(post?.status).toBe("OPEN");
  });

  it("a report can only be decided once", async () => {
    const harness = makeHarness();
    harness.as(admin);
    await harness.service.decideReport("report-01", "DISMISS");

    expect(await errorCode(() => harness.service.decideReport("report-01", "HIDE"))).toBe(
      "CONFLICT",
    );
  });
});
