import type { ClaimStatus, PostCategory, PostKind, PostStatus } from "./types";

/** User-facing names; never show the raw enum value in the UI. */
export const POST_KIND_LABELS: Record<PostKind, string> = {
  LOST: "Lost",
  FOUND: "Found",
};

export const POST_CATEGORIES = [
  "ELECTRONICS",
  "CAMPUS_CARD",
  "KEYS",
  "BOOKS",
  "CLOTHING",
  "OTHER",
] as const satisfies readonly PostCategory[];

export const CATEGORY_LABELS: Record<PostCategory, string> = {
  ELECTRONICS: "Electronics",
  CAMPUS_CARD: "Campus card",
  KEYS: "Keys",
  BOOKS: "Books",
  CLOTHING: "Clothing",
  OTHER: "Other",
};

export const POST_STATUS_LABELS: Record<PostStatus, string> = {
  OPEN: "Open",
  CLAIM_PENDING: "Claim pending",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
  HIDDEN: "Hidden",
};

export const CLAIM_STATUS_LABELS: Record<ClaimStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

/** Field limits, mirrored by the UI hints and by `schemas.ts`. */
export const TITLE_MIN_LENGTH = 4;
export const TITLE_MAX_LENGTH = 80;
export const DESCRIPTION_MIN_LENGTH = 10;
export const DESCRIPTION_MAX_LENGTH = 1200;
export const LOCATION_MIN_LENGTH = 2;
export const LOCATION_MAX_LENGTH = 80;
export const CLAIM_MIN_LENGTH = 30;
export const CLAIM_MAX_LENGTH = 600;
export const REPORT_MIN_LENGTH = 10;
export const REPORT_MAX_LENGTH = 400;

/** Upload rules (PRD FR-LF-02, LF-AC-03). */
export const MAX_IMAGES = 1;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

/** Statuses in which a post still accepts claim requests. */
export const CLAIMABLE_STATUSES = [
  "OPEN",
  "CLAIM_PENDING",
] as const satisfies readonly PostStatus[];

/** States in which the author may still edit or close the post. */
export const EDITABLE_STATUSES = ["OPEN", "CLAIM_PENDING"] as const satisfies readonly PostStatus[];

/**
 * Shortens a full name to "Given S." for public surfaces. PRD 7.6 forbids
 * showing full student numbers or names on public post pages.
 */
export function formatDisplayName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Someone";
  if (parts.length === 1) return parts[0]!;
  const last = parts[parts.length - 1]!;
  return `${parts[0]} ${last.slice(0, 1).toUpperCase()}.`;
}
