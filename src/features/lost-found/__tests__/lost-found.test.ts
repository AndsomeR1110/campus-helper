import { beforeEach, describe, expect, it } from "vitest";
import {
  canClaimPost,
  DEFAULT_FILTERS,
  parsePostFilters,
  toSearchString,
  validateImageMeta,
  validatePostInput,
} from "../index";
import {
  createPost,
  decideClaim,
  DEMO_VIEWERS,
  getPostDetail,
  hidePost,
  HttpError,
  listMyPosts,
  listPosts,
  resetStore,
  setPostStatus,
  submitClaim,
} from "../server";

function errorCode(run: () => unknown): string {
  try {
    run();
    return "NO_ERROR";
  } catch (error) {
    return error instanceof HttpError ? error.code : "NOT_HTTP_ERROR";
  }
}

const VALID_POST = {
  kind: "FOUND",
  title: "Black umbrella",
  category: "OTHER",
  location: "Main gate",
  occurredAt: "2026-10-20T09:00:00.000Z",
  description: "Two ribs are bent; left it at the security desk.",
  image: null,
};

beforeEach(() => {
  resetStore();
});

describe("create post", () => {
  it("LF-AC-01 publishes a valid post and shows it in the list", () => {
    const post = createPost(VALID_POST, DEMO_VIEWERS.student);
    expect(post.status).toBe("OPEN");
    expect(post.authorId).toBe(DEMO_VIEWERS.student.id);

    const titles = listPosts(DEFAULT_FILTERS, DEMO_VIEWERS.other).map((row) => row.title);
    expect(titles).toContain("Black umbrella");
  });

  it("LF-AC-02 rejects missing required fields and names each field", () => {
    const result = validatePostInput({ kind: "FOUND", title: "   " });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.errors).sort()).toEqual(
      ["category", "description", "location", "occurredAt", "title"].sort(),
    );
  });

  it("LF-AC-02 rejects a time in the future", () => {
    const result = validatePostInput({ ...VALID_POST, occurredAt: "2099-01-01T00:00:00.000Z" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.occurredAt).toBeDefined();
  });

  it("LF-AC-03 rejects an unsupported image type and an oversized photo", () => {
    expect(validateImageMeta({ name: "note.gif", type: "image/gif", size: 1024 }).ok).toBe(false);
    expect(
      validateImageMeta({ name: "huge.png", type: "image/png", size: 6 * 1024 * 1024 }).ok,
    ).toBe(false);
    const ok = validateImageMeta({ name: "photo.png", type: "image/png", size: 200 * 1024 });
    expect(ok.ok).toBe(true);
  });

  it("rejects a second photo when only one is allowed", () => {
    const first = { name: "a.png", type: "image/png", size: 1024 };
    expect(validateImageMeta([first, first]).ok).toBe(false);
  });
});

describe("browse and filter", () => {
  it("LF-AC-04 filters by keyword, type and category", () => {
    const byKeyword = listPosts({ ...DEFAULT_FILTERS, q: "bottle" }, DEMO_VIEWERS.student);
    expect(byKeyword).toHaveLength(1);
    expect(byKeyword[0]?.title).toBe("Blue water bottle");

    const byType = listPosts({ ...DEFAULT_FILTERS, kind: "LOST" }, DEMO_VIEWERS.student);
    expect(byType.every((post) => post.kind === "LOST")).toBe(true);

    const byCategory = listPosts(
      { ...DEFAULT_FILTERS, category: "ELECTRONICS" },
      DEMO_VIEWERS.student,
    );
    expect(byCategory.every((post) => post.category === "ELECTRONICS")).toBe(true);
  });

  it("LF-AC-04 ignores unknown search params instead of failing", () => {
    const filters = parsePostFilters({ kind: "spaceship", category: "42" });
    expect(filters).toEqual({ q: "", kind: "ALL", category: "ALL" });
    expect(toSearchString({ kind: "LOST" })).toBe("?kind=LOST");
  });

  it("keeps a hidden post out of the list for everyone but its author", () => {
    hidePost("post-07", DEMO_VIEWERS.admin);

    const others = listPosts(DEFAULT_FILTERS, DEMO_VIEWERS.student).map((post) => post.id);
    expect(others).not.toContain("post-07");

    const author = listPosts(DEFAULT_FILTERS, DEMO_VIEWERS.other).map((post) => post.id);
    expect(author).toContain("post-07");

    expect(getPostDetail("post-07", DEMO_VIEWERS.student)).toBeNull();
    expect(getPostDetail("post-07", DEMO_VIEWERS.other)?.post.status).toBe("HIDDEN");
  });

  it("LF-AC-08 lists only the viewer's own posts in My Posts", () => {
    const mine = listMyPosts(DEMO_VIEWERS.student);
    expect(mine.every((post) => post.authorId === DEMO_VIEWERS.student.id)).toBe(true);
  });
});

describe("claims", () => {
  it("LF-AC-05 lets another student claim an open post and moves it to Claim Pending", () => {
    const claim = submitClaim(
      "post-05",
      { message: "The tag has my room number written on the back." },
      DEMO_VIEWERS.student,
    );
    expect(claim.status).toBe("PENDING");

    const detail = getPostDetail("post-05", DEMO_VIEWERS.other);
    expect(detail?.post.status).toBe("CLAIM_PENDING");
  });

  it("does not let the author claim their own post", () => {
    expect(
      errorCode(() => submitClaim("post-02", { message: "x".repeat(40) }, DEMO_VIEWERS.student)),
    ).toBe("FORBIDDEN");
  });

  it("LF-AC-06 hides private claim text from users who are not the author", () => {
    const asStranger = getPostDetail("post-03", DEMO_VIEWERS.student);
    expect(asStranger?.claimCount).toBe(2);
    expect(asStranger?.claims).toBeNull();

    const asAuthor = getPostDetail("post-03", DEMO_VIEWERS.other);
    expect(asAuthor?.claims).toHaveLength(2);
    const asAdmin = getPostDetail("post-03", DEMO_VIEWERS.admin);
    expect(asAdmin?.claims).not.toBeNull();
  });

  it("LF-AC-07 rejects every other claim once one is accepted and stops new claims", () => {
    const accepted = decideClaim("claim-01", "ACCEPT", DEMO_VIEWERS.other);
    expect(accepted.status).toBe("APPROVED");

    const detail = getPostDetail("post-03", DEMO_VIEWERS.other);
    expect(detail?.post.status).toBe("RESOLVED");
    expect(detail?.claims?.find((claim) => claim.id === "claim-02")?.status).toBe("REJECTED");
    expect(canClaimPost(detail!.post, DEMO_VIEWERS.student).ok).toBe(false);
  });

  it("returns the post to Open when the last pending claim is rejected", () => {
    decideClaim("claim-01", "REJECT", DEMO_VIEWERS.other);
    const detail = getPostDetail("post-03", DEMO_VIEWERS.other);
    expect(detail?.post.status).toBe("CLAIM_PENDING");

    decideClaim("claim-02", "REJECT", DEMO_VIEWERS.other);
    expect(getPostDetail("post-03", DEMO_VIEWERS.other)?.post.status).toBe("OPEN");
  });
});

describe("author permissions", () => {
  it("LF-AC-08 forbids editing another user's post and allows the author to close it", () => {
    expect(errorCode(() => setPostStatus("post-01", "CLOSED", DEMO_VIEWERS.student))).toBe(
      "FORBIDDEN",
    );

    const closed = setPostStatus("post-02", "CLOSED", DEMO_VIEWERS.student);
    expect(closed.status).toBe("CLOSED");
    expect(errorCode(() => setPostStatus("post-02", "RESOLVED", DEMO_VIEWERS.student))).toBe(
      "CONFLICT",
    );
  });

  it("rejects a claim on a post that is already resolved", () => {
    expect(
      errorCode(() => submitClaim("post-04", { message: "y".repeat(40) }, DEMO_VIEWERS.other)),
    ).toBe("CONFLICT");
  });
});
