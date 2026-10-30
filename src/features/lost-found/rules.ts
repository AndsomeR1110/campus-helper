/**
 * Business rules (PRD §9, LF-AC-05 … LF-AC-09).
 *
 * Every function is pure and returns a tagged result instead of throwing, so
 * the same rule can be unit-tested and reused by pages, API handlers and
 * services. Permission is always checked here — never only in the UI.
 */
import { CLAIMABLE_STATUSES } from "./constants";
import type { ClaimStatus, LostFoundClaim, LostFoundPost, PostStatus, Viewer } from "./types";

export type RuleErrorCode = "FORBIDDEN" | "NOT_FOUND" | "CONFLICT";

export type RuleResult = { ok: true } | { ok: false; code: RuleErrorCode; message: string };

const ALLOW = { ok: true } as const;

function deny(code: RuleErrorCode, message: string): RuleResult {
  return { ok: false, code, message };
}

export function isAdmin(viewer: Viewer): boolean {
  return viewer.role === "ADMIN";
}

export function isAuthor(post: LostFoundPost, viewer: Viewer): boolean {
  return post.authorId === viewer.id;
}

/** A hidden post disappears for everybody except its author and admins (FR-LF-08). */
export function canViewPost(post: LostFoundPost, viewer: Viewer): boolean {
  if (post.status !== "HIDDEN") return true;
  return isAuthor(post, viewer) || isAdmin(viewer);
}

/** Private claim text is readable by the author and admins only (FR-LF-05, LF-AC-06). */
export function canReadClaims(post: LostFoundPost, viewer: Viewer): boolean {
  return isAuthor(post, viewer) || isAdmin(viewer);
}

/** A resolved or closed post no longer takes claims (LF-AC-07). */
export function acceptsClaims(post: LostFoundPost): boolean {
  return CLAIMABLE_STATUSES.includes(post.status);
}

export function canClaimPost(post: LostFoundPost, viewer: Viewer): RuleResult {
  if (!canViewPost(post, viewer)) return deny("NOT_FOUND", "This post is not available.");
  if (isAuthor(post, viewer)) return deny("FORBIDDEN", "You cannot claim your own post.");
  if (!acceptsClaims(post)) {
    return deny("CONFLICT", "This post is no longer accepting claims.");
  }
  return ALLOW;
}

export function canDecideClaim(
  post: LostFoundPost,
  claim: LostFoundClaim,
  viewer: Viewer,
): RuleResult {
  if (claim.postId !== post.id) return deny("NOT_FOUND", "This claim is not available.");
  if (!isAuthor(post, viewer) && !isAdmin(viewer)) {
    return deny("FORBIDDEN", "Only the person who posted this item can decide a claim.");
  }
  if (claim.status !== "PENDING") return deny("CONFLICT", "This claim has already been decided.");
  if (post.status === "RESOLVED" || post.status === "CLOSED") {
    return deny("CONFLICT", "This post is already closed.");
  }
  return ALLOW;
}

/** The author can mark their own post resolved or closed. */
export function canClosePost(post: LostFoundPost, viewer: Viewer): RuleResult {
  if (!isAuthor(post, viewer))
    return deny("FORBIDDEN", "Only the person who posted this can do that.");
  if (post.status === "RESOLVED" || post.status === "CLOSED" || post.status === "HIDDEN") {
    return deny("CONFLICT", "This post is already closed.");
  }
  return ALLOW;
}

/** Editing keeps the public fields in sync, so it is allowed while the post is live. */
export function canEditPost(post: LostFoundPost, viewer: Viewer): RuleResult {
  if (!isAuthor(post, viewer)) return deny("FORBIDDEN", "You can only edit your own posts.");
  if (post.status === "HIDDEN") return deny("NOT_FOUND", "This post is not available.");
  if (post.status === "RESOLVED" || post.status === "CLOSED") {
    return deny("CONFLICT", "A resolved or closed post cannot be edited.");
  }
  return ALLOW;
}

export function canDeletePost(post: LostFoundPost, viewer: Viewer): RuleResult {
  if (!isAuthor(post, viewer) && !isAdmin(viewer)) {
    return deny("FORBIDDEN", "You can only delete your own posts.");
  }
  return ALLOW;
}

export function canReportPost(post: LostFoundPost, viewer: Viewer): RuleResult {
  if (!canViewPost(post, viewer)) return deny("NOT_FOUND", "This post is not available.");
  if (isAuthor(post, viewer)) return deny("FORBIDDEN", "You cannot report your own post.");
  return ALLOW;
}

/** Moderation is an admin action (FR-LF-08, LF-AC-09). */
export function canModerate(viewer: Viewer): RuleResult {
  if (!isAdmin(viewer)) return deny("FORBIDDEN", "Only administrators can moderate posts.");
  return ALLOW;
}

/** Hiding is allowed from any status except already hidden. */
export function canHidePost(post: LostFoundPost, viewer: Viewer): RuleResult {
  const moderate = canModerate(viewer);
  if (!moderate.ok) return moderate;
  if (post.status === "HIDDEN") return deny("CONFLICT", "This post is already hidden.");
  return ALLOW;
}

/**
 * After a rejection the post returns to Open, unless another claim is still
 * waiting — then it stays in Claim Pending.
 */
export function statusAfterClaimRejected(pendingClaims: number): PostStatus {
  return pendingClaims > 0 ? "CLAIM_PENDING" : "OPEN";
}

/**
 * Accepting one claim decides the rest: everything still pending is rejected
 * and the post becomes Resolved (FR-LF-06).
 */
export function claimStatusesAfterAccept(
  claims: readonly LostFoundClaim[],
  acceptedId: string,
): ReadonlyMap<string, ClaimStatus> {
  const result = new Map<string, ClaimStatus>();
  for (const claim of claims) {
    if (claim.id === acceptedId) result.set(claim.id, "APPROVED");
    else if (claim.status === "PENDING") result.set(claim.id, "REJECTED");
  }
  return result;
}
