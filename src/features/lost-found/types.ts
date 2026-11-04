/**
 * Lost & Found domain types (PRD FR-LF-01 … FR-LF-08).
 *
 * Everything here is shared by the server rules, the route handlers and the
 * pages, so it stays free of database and React imports.
 */

export type PostKind = "LOST" | "FOUND";

/** PRD 7.4 state machine: OPEN → CLAIM_PENDING → RESOLVED, plus CLOSED and HIDDEN. */
export type PostStatus = "OPEN" | "CLAIM_PENDING" | "RESOLVED" | "CLOSED" | "HIDDEN";

export type PostCategory = "ELECTRONICS" | "CAMPUS_CARD" | "KEYS" | "BOOKS" | "CLOTHING" | "OTHER";

export type ClaimStatus = "PENDING" | "APPROVED" | "REJECTED";

export type ViewerRole = "STUDENT" | "TEACHER" | "ADMIN";

/** Supplied by a trusted server session adapter, never by request JSON. */
export interface Viewer {
  id: string;
  role: ViewerRole;
  /** Full name; the UI shortens it with `formatDisplayName`. */
  name: string;
}

/** Metadata of an uploaded photo. `url` is filled in once storage is wired (PR-2). */
export interface ImageMeta {
  name: string;
  type: string;
  size: number;
  /** Filled once the upload storage exists (PR-2); null while the field is metadata only. */
  url?: string | null;
}

export interface LostFoundPost {
  id: string;
  authorId: string;
  authorName: string;
  kind: PostKind;
  category: PostCategory;
  title: string;
  description: string;
  location: string;
  /** ISO 8601 instant of when the item was lost or found. Never in the future. */
  occurredAt: string;
  status: PostStatus;
  image: ImageMeta | null;
  createdAt: string;
  updatedAt: string;
}

export interface LostFoundClaim {
  id: string;
  postId: string;
  claimantId: string;
  claimantName: string;
  /** Private proof of ownership; only the post author and admins may read it. */
  message: string;
  status: ClaimStatus;
  createdAt: string;
  decidedAt: string | null;
}

/** Fields a client may submit; server-owned fields are added by the service. */
export interface NewPostInput {
  kind: PostKind;
  category: PostCategory;
  title: string;
  description: string;
  location: string;
  occurredAt: string;
  image: ImageMeta | null;
}

export interface NewClaimInput {
  message: string;
}

export interface PostFilters {
  query?: string;
  kind?: PostKind;
  category?: PostCategory;
}

/** Row shape for the list page: claim count saves one query per card. */
export interface PostListItem extends LostFoundPost {
  claimCount: number;
}

/**
 * Detail payload. `claims` is `null` when the viewer may not read them, so a
 * page never has to decide whether to trust the field.
 */
export interface PostDetail {
  post: LostFoundPost;
  claimCount: number;
  claims: LostFoundClaim[] | null;
}
