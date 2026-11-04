import { describe, expect, it } from "vitest";

import { formatDisplayName } from "../constants";
import {
  LostFoundError,
  canEditPost,
  canReadClaims,
  canSetPostStatus,
  canSubmitClaim,
  canViewPost,
  claimStatusesAfterAccept,
  postStatusAfterReject,
  publicAuthorName,
  requireAdminViewer,
  requireViewer,
} from "../rules";
import type { LostFoundClaim, LostFoundPost } from "../types";
import { admin, mei, teacher, wei } from "./fixtures";

function post(overrides: Partial<LostFoundPost> = {}): LostFoundPost {
  return {
    id: "post-1",
    authorId: wei.id,
    authorName: wei.name,
    kind: "LOST",
    category: "KEYS",
    title: "Dorm key",
    description: "Single key on a red tag.",
    location: "Basketball court",
    occurredAt: "2026-11-01T09:00:00.000Z",
    status: "OPEN",
    image: null,
    createdAt: "2026-11-01T09:05:00.000Z",
    updatedAt: "2026-11-01T09:05:00.000Z",
    ...overrides,
  };
}

function claim(overrides: Partial<LostFoundClaim> = {}): LostFoundClaim {
  return {
    id: "claim-1",
    postId: "post-1",
    claimantId: mei.id,
    claimantName: mei.name,
    message: "There is a small scratch on the back of the tag.",
    status: "PENDING",
    createdAt: "2026-11-02T09:00:00.000Z",
    decidedAt: null,
    ...overrides,
  };
}

describe("post visibility (LF-AC-09 prep)", () => {
  it("hides a HIDDEN post from strangers but not from the author or an admin", () => {
    const hidden = post({ status: "HIDDEN" });
    expect(canViewPost(hidden, mei)).toBe(false);
    expect(canViewPost(hidden, null)).toBe(false);
    expect(canViewPost(hidden, wei)).toBe(true);
    expect(canViewPost(hidden, admin)).toBe(true);
  });

  it("keeps an OPEN post public", () => {
    expect(canViewPost(post(), null)).toBe(true);
  });
});

describe("claim privacy (LF-AC-06)", () => {
  it("only lets the author and administrators read claim messages", () => {
    const item = post();
    expect(canReadClaims(item, wei)).toBe(true);
    expect(canReadClaims(item, admin)).toBe(true);
    expect(canReadClaims(item, mei)).toBe(false);
    expect(canReadClaims(item, teacher)).toBe(false);
    expect(canReadClaims(item, null)).toBe(false);
  });
});

describe("who may claim (LF-AC-05, LF-AC-07)", () => {
  it("allows another signed-in user while the item is open", () => {
    expect(canSubmitClaim(post(), mei)).toBe(true);
    expect(canSubmitClaim(post({ status: "CLAIM_PENDING" }), teacher)).toBe(true);
  });

  it("refuses the author, guests and finished items", () => {
    expect(canSubmitClaim(post(), wei)).toBe(false);
    expect(canSubmitClaim(post(), null)).toBe(false);
    expect(canSubmitClaim(post({ status: "RESOLVED" }), mei)).toBe(false);
    expect(canSubmitClaim(post({ status: "CLOSED" }), mei)).toBe(false);
    expect(canSubmitClaim(post({ status: "HIDDEN" }), mei)).toBe(false);
  });
});

describe("claim decisions", () => {
  it("approves the chosen claim and rejects the other pending ones", () => {
    const claims = [
      claim({ id: "claim-1" }),
      claim({ id: "claim-2" }),
      claim({ id: "claim-3", status: "REJECTED" }),
    ];
    const next = claimStatusesAfterAccept(claims, "claim-1");
    expect(next.get("claim-1")).toBe("APPROVED");
    expect(next.get("claim-2")).toBe("REJECTED");
    expect(next.has("claim-3")).toBe(false);
  });

  it("returns the post to OPEN only when nothing is pending", () => {
    expect(postStatusAfterReject(0)).toBe("OPEN");
    expect(postStatusAfterReject(1)).toBe("CLAIM_PENDING");
  });

  it("lets only the author resolve or close, and only while unfinished", () => {
    expect(canSetPostStatus(post(), wei, "RESOLVED")).toBe(true);
    expect(canSetPostStatus(post(), wei, "CLOSED")).toBe(true);
    expect(canSetPostStatus(post(), mei, "RESOLVED")).toBe(false);
    expect(canSetPostStatus(post({ status: "RESOLVED" }), wei, "CLOSED")).toBe(false);
    expect(canSetPostStatus(post({ status: "HIDDEN" }), wei, "CLOSED")).toBe(false);
  });

  it("only lets the author edit an unfinished post", () => {
    expect(canEditPost(post(), wei)).toBe(true);
    expect(canEditPost(post(), admin)).toBe(false);
    expect(canEditPost(post({ status: "CLOSED" }), wei)).toBe(false);
  });
});

describe("session helpers", () => {
  it("rejects a missing viewer as 401 and a non-admin as 403", () => {
    expect(() => requireViewer(null)).toThrow(LostFoundError);
    try {
      requireViewer(null);
    } catch (error) {
      expect((error as LostFoundError).status).toBe(401);
      expect((error as LostFoundError).code).toBe("UNAUTHENTICATED");
    }

    try {
      requireAdminViewer(wei);
    } catch (error) {
      expect((error as LostFoundError).status).toBe(403);
      expect((error as LostFoundError).code).toBe("FORBIDDEN");
    }
    expect(requireAdminViewer(admin).role).toBe("ADMIN");
  });
});

describe("display name", () => {
  it("shortens to given name plus the initial", () => {
    expect(formatDisplayName("Wei Chen")).toBe("Wei C.");
    expect(formatDisplayName("Ana")).toBe("Ana");
    expect(formatDisplayName("   ")).toBe("Someone");
    expect(publicAuthorName(post())).toBe("Wei C.");
  });
});
