/**
 * Lost & Found domain types (PRD FR-LF-01 … FR-LF-08, entities §9).
 * Enum values match `STATUS_MAP` in `src/components/ui/status-badge.tsx` and the
 * names Member 2 will use in `prisma/schema.prisma`.
 */

/** A post is either something you lost or something you found (FR-LF-01). */
export type PostKind = "LOST" | "FOUND";

/** Open → Claim Pending → Resolved; also Open → Closed, and any → Hidden (PRD §9.1). */
export type PostStatus = "OPEN" | "CLAIM_PENDING" | "RESOLVED" | "CLOSED" | "HIDDEN";

/** Item categories (FR-LF-02). */
export type PostCategory = "ELECTRONICS" | "CAMPUS_CARD" | "KEYS" | "BOOKS" | "CLOTHING" | "OTHER";

/** Pending → Approved / Rejected (PRD §9.1). */
export type ClaimStatus = "PENDING" | "APPROVED" | "REJECTED";

export type ReportStatus = "PENDING" | "RESOLVED" | "DISMISSED";

export type ViewerRole = "STUDENT" | "TEACHER" | "ADMIN";

/** The signed-in user. Replaced by Member 2's `getCurrentUser()` once auth lands. */
export interface Viewer {
  readonly id: string;
  readonly name: string;
  readonly role: ViewerRole;
}

/**
 * Metadata for the optional photo (FR-LF-02). The binary is not stored in this
 * module; see INTEGRATION.md. Validating the metadata is what LF-AC-03 checks.
 */
export interface ImageMeta {
  readonly name: string;
  readonly type: string;
  readonly size: number;
}

export interface LostFoundPost {
  readonly id: string;
  readonly kind: PostKind;
  readonly status: PostStatus;
  readonly title: string;
  readonly category: PostCategory;
  readonly location: string;
  /** When the item was lost or found (ISO 8601, UTC). */
  readonly occurredAt: string;
  readonly description: string;
  readonly image: ImageMeta | null;
  readonly authorId: string;
  readonly authorName: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** A claim carries a private description, readable only by the author and admins (FR-LF-05). */
export interface LostFoundClaim {
  readonly id: string;
  readonly postId: string;
  readonly claimantId: string;
  readonly claimantName: string;
  readonly message: string;
  readonly status: ClaimStatus;
  readonly createdAt: string;
  readonly decidedAt: string | null;
}

export interface LostFoundReport {
  readonly id: string;
  readonly postId: string;
  readonly reporterId: string;
  readonly reporterName: string;
  readonly reason: string;
  readonly status: ReportStatus;
  readonly createdAt: string;
  readonly resolvedAt: string | null;
}

/** Fields a client may submit when creating a post. Everything else is set by the server. */
export interface NewPostInput {
  readonly kind: PostKind;
  readonly title: string;
  readonly category: PostCategory;
  readonly location: string;
  readonly occurredAt: string;
  readonly description: string;
  readonly image: ImageMeta | null;
}

/** Filter state, kept in the URL so a filtered list survives a refresh and can be shared. */
export interface PostFilters {
  readonly q: string;
  readonly kind: PostKind | "ALL";
  readonly category: PostCategory | "ALL";
}

/** A row in the list pages. */
export interface PostListItem extends LostFoundPost {
  /** How many claims the post has. Safe to show everybody. */
  readonly claimCount: number;
}

/**
 * What the detail page is allowed to render. `claims` stays `null` unless the
 * viewer is the author or an admin, so private text never reaches a client
 * component for a user who may not read it (LF-AC-06).
 */
export interface PostDetail {
  readonly post: LostFoundPost;
  readonly claimCount: number;
  readonly claims: readonly LostFoundClaim[] | null;
}
