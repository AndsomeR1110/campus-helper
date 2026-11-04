import { describe, expect, it } from "vitest";

import { DEMO_POSTS } from "../demo-data";
import { LostFoundError } from "../rules";
import type { LostFoundErrorCode } from "../rules";
import { admin, makeHarness, mei, NOW, teacher, VALID_POST, wei } from "./fixtures";

/** Asserts the thrown error without leaking a stack trace into the output. */
function expectError(run: () => Promise<unknown>, code: LostFoundErrorCode): Promise<void> {
  return run().then(
    () => {
      throw new Error(`expected ${code}, but the call resolved`);
    },
    (error: unknown) => {
      expect(error).toBeInstanceOf(LostFoundError);
      expect((error as LostFoundError).code).toBe(code);
    },
  );
}

describe("browsing (LF-AC-01, LF-AC-04)", () => {
  it("lists every public post, newest first, with a claim count", async () => {
    const { service } = makeHarness();
    const posts = await service.listPosts({});
    expect(posts.map((post) => post.id)).toEqual(["post-01", "post-02", "post-03", "post-04"]);
    expect(posts[0]).toMatchObject({ title: "Blue water bottle", claimCount: 0 });
  });

  it("keeps the hidden post out of every list but reachable for its author", async () => {
    const harness = makeHarness();
    expect((await harness.service.listPosts({})).some((post) => post.id === "post-05")).toBe(false);

    harness.as(mei);
    expect((await harness.service.listPosts({})).some((post) => post.id === "post-05")).toBe(false);
    await expectError(() => harness.service.getPost("post-05"), "NOT_FOUND");

    harness.as(wei);
    expect((await harness.service.getPost("post-05")).post.status).toBe("HIDDEN");
  });

  it("applies search, kind and category filters together", async () => {
    const { service } = makeHarness();
    expect((await service.listPosts({ query: "bottle" })).map((post) => post.id)).toEqual([
      "post-01",
    ]);
    expect((await service.listPosts({ kind: "LOST" })).map((post) => post.id)).toEqual([
      "post-02",
      "post-04",
    ]);
    expect((await service.listPosts({ kind: "LOST", category: "BOOKS" })).map((p) => p.id)).toEqual(
      ["post-04"],
    );
    expect(await service.listPosts({ query: "no such item" })).toEqual([]);
  });

  it("shows 'my posts' as the signed-in author only, hidden ones included", async () => {
    const harness = makeHarness();
    expect((await harness.service.listMyPosts()).map((post) => post.id)).toEqual([
      "post-02",
      "post-05",
    ]);

    harness.as(null);
    await expectError(() => harness.service.listMyPosts(), "UNAUTHENTICATED");
  });
});

describe("post creation (LF-AC-01, LF-AC-02)", () => {
  it("stores a valid post as OPEN and shortens the author name", async () => {
    const { service, repository } = makeHarness();
    const post = await service.createPost(VALID_POST);

    expect(post).toMatchObject({
      id: "id-1",
      authorId: wei.id,
      authorName: "Wei Chen",
      status: "OPEN",
      createdAt: NOW.toISOString(),
    });
    expect(await repository.getPost(post.id)).not.toBeNull();
    expect((await service.listPosts({ query: "Grey notebook" }))[0]?.id).toBe(post.id);
  });

  it("refuses a date in the future", async () => {
    const { service } = makeHarness();
    await expectError(
      () => service.createPost({ ...VALID_POST, occurredAt: "2026-12-01T09:00:00.000Z" }),
      "VALIDATION_ERROR",
    );
  });

  it("refuses an anonymous author", async () => {
    const harness = makeHarness(DEMO_POSTS, null);
    await expectError(() => harness.service.createPost(VALID_POST), "UNAUTHENTICATED");
  });
});

describe("claims (LF-AC-05, LF-AC-06, LF-AC-07)", () => {
  it("lets another user claim an open post and moves the post to CLAIM_PENDING", async () => {
    const harness = makeHarness();
    // post-01 belongs to Mei, so Wei is an ordinary claimer.
    const claim = await harness.service.submitClaim("post-01", {
      message: "The bottle has a scratch on the base and a blue lid.",
    });

    expect(claim).toMatchObject({
      status: "PENDING",
      claimantId: wei.id,
      claimantName: "Wei Chen",
    });

    harness.as(mei);
    const detail = await harness.service.getPost("post-01");
    expect(detail.post.status).toBe("CLAIM_PENDING");
    expect(detail.claimCount).toBe(1);
    expect(detail.claims?.[0]?.message).toContain("scratch");

    // A passer-by sees that claims exist but not what they say.
    harness.as(teacher);
    const asTeacher = await harness.service.getPost("post-01");
    expect(asTeacher.claims).toBeNull();
    expect(asTeacher.claimCount).toBe(1);
  });

  it("stops the author from claiming their own post and stops duplicate claims", async () => {
    const harness = makeHarness();
    await expectError(
      () =>
        harness.service.submitClaim("post-02", { message: "That is my own card, ignore this." }),
      "FORBIDDEN",
    );

    harness.as(teacher);
    await harness.service.submitClaim("post-01", { message: "Blue bottle, sticker on the lid." });
    await expectError(
      () => harness.service.submitClaim("post-01", { message: "Blue bottle, sticker on the lid." }),
      "CONFLICT",
    );
  });

  it("refuses claims on a resolved post", async () => {
    const harness = makeHarness();
    await expectError(
      () => harness.service.submitClaim("post-04", { message: "This book is mine, I lost it." }),
      "FORBIDDEN",
    );
  });

  it("approves one claim, rejects the rest and blocks further claims", async () => {
    const harness = makeHarness();
    harness.as(teacher);
    const first = await harness.service.submitClaim("post-01", {
      message: "The lid has a sticker and the base is scratched.",
    });
    harness.as(wei);
    await harness.service.submitClaim("post-01", {
      message: "I lost it near the library desk last week.",
    });

    harness.as(mei);
    const accepted = await harness.service.decideClaim(first.id, "ACCEPT");
    expect(accepted.claim.status).toBe("APPROVED");
    // Accepting does not finish the post: the author still confirms the handover.
    expect(accepted.post.status).toBe("CLAIM_PENDING");

    const detail = await harness.service.getPost("post-01");
    expect(detail.claims?.map((claim) => claim.status)).toEqual(["APPROVED", "REJECTED"]);

    harness.as(admin);
    await expectError(
      () =>
        harness.service.submitClaim("post-01", { message: "I also lost a bottle here yesterday." }),
      "FORBIDDEN",
    );
  });

  it("returns the post to OPEN when the only pending claim is rejected", async () => {
    const harness = makeHarness();
    const claim = await harness.service.submitClaim("post-01", {
      message: "The bottle has a blue lid and a sticker.",
    });
    harness.as(mei);
    expect((await harness.service.getPost("post-01")).post.status).toBe("CLAIM_PENDING");

    const rejected = await harness.service.decideClaim(claim.id, "REJECT");
    expect(rejected.claim.status).toBe("REJECTED");
    expect(rejected.post.status).toBe("OPEN");
  });

  it("refuses decisions from anyone but the author", async () => {
    const harness = makeHarness();
    const claim = await harness.service.submitClaim("post-01", {
      message: "The bottle has a blue lid and a sticker.",
    });

    await expectError(() => harness.service.decideClaim(claim.id, "ACCEPT"), "FORBIDDEN");
    harness.as(admin);
    await expectError(() => harness.service.decideClaim(claim.id, "ACCEPT"), "FORBIDDEN");
  });
});

describe("finishing a post (LF-AC-07, LF-AC-08)", () => {
  it("lets the author resolve it and then refuses new claims", async () => {
    const harness = makeHarness();
    const resolved = await harness.service.setPostStatus("post-02", "RESOLVED");
    expect(resolved.status).toBe("RESOLVED");

    harness.as(teacher);
    await expectError(
      () =>
        harness.service.submitClaim("post-02", {
          message: "The card is mine, name starts with A.",
        }),
      "FORBIDDEN",
    );
  });

  it("refuses edits from anyone but the author and from a finished post", async () => {
    const harness = makeHarness();
    harness.as(mei);
    await expectError(() => harness.service.setPostStatus("post-02", "CLOSED"), "FORBIDDEN");
    // post-04 belongs to Mei, but it is already RESOLVED.
    await expectError(() => harness.service.setPostStatus("post-04", "CLOSED"), "FORBIDDEN");

    harness.as(wei);
    expect((await harness.service.setPostStatus("post-02", "CLOSED")).status).toBe("CLOSED");
  });
});
