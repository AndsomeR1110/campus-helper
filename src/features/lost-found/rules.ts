import { CLAIMABLE_STATUSES, EDITABLE_STATUSES, formatDisplayName } from "./constants";
import type { ClaimStatus, LostFoundClaim, LostFoundPost, PostStatus, Viewer } from "./types";

/**
 * Business rules of the Lost & Found module as pure functions.
 *
 * Kept separate from the service so every rule can be unit tested without a
 * database, and so the pages can ask "may this viewer see this?" without
 * duplicating the condition. The service is still the only place that writes.
 */

export type LostFoundErrorCode =
  "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT" | "VALIDATION_ERROR";

const STATUS_BY_CODE: Record<LostFoundErrorCode, 400 | 401 | 403 | 404 | 409> = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
};

/** A rule violation carrying the HTTP status the route handler should return. */
export class LostFoundError extends Error {
  readonly code: LostFoundErrorCode;
  readonly status: 400 | 401 | 403 | 404 | 409;

  constructor(code: LostFoundErrorCode, message: string) {
    super(message);
    this.name = "LostFoundError";
    this.code = code;
    this.status = STATUS_BY_CODE[code];
  }
}

export function isAdmin(viewer: Viewer | null): boolean {
  return viewer?.role === "ADMIN";
}

export function isAuthor(post: LostFoundPost, viewer: Viewer | null): boolean {
  return viewer !== null && viewer.id === post.authorId;
}

/** Public surfaces show "Given L.", never the full name (PRD 7.6). */
export function publicAuthorName(post: LostFoundPost): string {
  return formatDisplayName(post.authorName);
}

/**
 * Hidden posts stay readable for their author and for administrators, which is
 * how LF-AC-09 is reviewed after a decision.
 */
export function canViewPost(post: LostFoundPost, viewer: Viewer | null): boolean {
  if (post.status !== "HIDDEN") return true;
  return isAdmin(viewer) || isAuthor(post, viewer);
}

/**
 * Claim messages are private (FR-LF-05): only the author and administrators may
 * read them. This is what keeps LF-AC-06 true on the detail page.
 */
export function canReadClaims(post: LostFoundPost, viewer: Viewer | null): boolean {
  return isAdmin(viewer) || isAuthor(post, viewer);
}

export function acceptsClaims(post: LostFoundPost): boolean {
  return (CLAIMABLE_STATUSES as readonly PostStatus[]).includes(post.status);
}

export function canSubmitClaim(post: LostFoundPost, viewer: Viewer | null): boolean {
  if (!viewer) return false;
  if (isAuthor(post, viewer)) return false;
  return acceptsClaims(post);
}

export function canDecideClaimForPost(
  post: LostFoundPost,
  claim: LostFoundClaim,
  viewer: Viewer | null,
): boolean {
  return claim.status === "PENDING" && isAuthor(post, viewer);
}

export function canSetPostStatus(
  post: LostFoundPost,
  viewer: Viewer | null,
  next: "RESOLVED" | "CLOSED",
): boolean {
  if (!isAuthor(post, viewer)) return false;
  if (!(EDITABLE_STATUSES as readonly PostStatus[]).includes(post.status)) return false;
  return next === "RESOLVED" || next === "CLOSED";
}

export function canEditPost(post: LostFoundPost, viewer: Viewer | null): boolean {
  return (
    isAuthor(post, viewer) && (EDITABLE_STATUSES as readonly PostStatus[]).includes(post.status)
  );
}

/** Accepting one claim closes the other pending ones (PRD Flow 04). */
export function claimStatusesAfterAccept(
  claims: readonly LostFoundClaim[],
  acceptedId: string,
): Map<string, ClaimStatus> {
  const next = new Map<string, ClaimStatus>();
  for (const claim of claims) {
    if (claim.status !== "PENDING" && claim.id !== acceptedId) continue;
    next.set(claim.id, claim.id === acceptedId ? "APPROVED" : "REJECTED");
  }
  return next;
}

/**
 * Rejecting a claim returns the post to OPEN once nothing is pending, so the
 * item can be claimed again. Accepting leaves the post CLAIM_PENDING: the author
 * still has to confirm the handover (FR-LF-06, Flow 04).
 */
export function postStatusAfterReject(remainingPending: number): PostStatus {
  return remainingPending > 0 ? "CLAIM_PENDING" : "OPEN";
}

export function requireViewer(viewer: Viewer | null): Viewer {
  if (!viewer) throw new LostFoundError("UNAUTHENTICATED", "Sign in to continue.");
  return viewer;
}

export function requireAdminViewer(viewer: Viewer | null): Viewer {
  const current = requireViewer(viewer);
  if (current.role !== "ADMIN") {
    throw new LostFoundError("FORBIDDEN", "Only administrators can do this.");
  }
  return current;
}
