import type { PostCategory, PostKind, PostStatus, ClaimStatus } from "./types";

/** Item categories offered in the create form and the filter row (FR-LF-02). */
export const POST_CATEGORIES: readonly PostCategory[] = [
  "ELECTRONICS",
  "CAMPUS_CARD",
  "KEYS",
  "BOOKS",
  "CLOTHING",
  "OTHER",
];

export const CATEGORY_LABELS: Record<PostCategory, string> = {
  ELECTRONICS: "Electronics",
  CAMPUS_CARD: "Campus card",
  KEYS: "Keys",
  BOOKS: "Books",
  CLOTHING: "Clothing",
  OTHER: "Other",
};

export const POST_KIND_LABELS: Record<PostKind, string> = {
  LOST: "Lost",
  FOUND: "Found",
};

/** Status wording for the filter list. Badges use `STATUS_MAP` instead. */
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

/* ---- Limits (FR-LF-02, FR-LF-05, LF-AC-03) ------------------------------ */

export const MAX_TITLE_LENGTH = 80;
export const MAX_DESCRIPTION_LENGTH = 1200;
export const MAX_LOCATION_LENGTH = 80;
export const MIN_CLAIM_MESSAGE_LENGTH = 30;
export const MAX_CLAIM_MESSAGE_LENGTH = 600;
export const MAX_REPORT_REASON_LENGTH = 400;

/** One photo per post in the MVP. */
export const MAX_IMAGES = 1;
export const ALLOWED_IMAGE_TYPES: readonly string[] = ["image/png", "image/jpeg", "image/webp"];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Lists are capped rather than paginated in the MVP (PRD 搂11.1 allows a limit). */
export const MAX_LIST_ITEMS = 50;

/** Statuses in which a post still accepts new claims (FR-LF-05, LF-AC-05, LF-AC-07). */
export const CLAIMABLE_STATUSES: readonly PostStatus[] = ["OPEN", "CLAIM_PENDING"];
/**
 * Display name rule from docs/agent-prompts.md: never show a full real name —
 * "Wei Chen" becomes "Wei C.". Applied wherever a name is rendered.
 */
export function formatDisplayName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Someone";
  if (parts.length === 1) return parts[0]!;
  const given = parts.slice(0, -1).join(" ");
  const surnameInitial = parts[parts.length - 1]!.charAt(0).toUpperCase();
  return `${given} ${surnameInitial}.`;
}
