import type { ClaimStatus, LostFoundClaim, LostFoundPost, PostCategory } from "../types";

/** Fields the service is allowed to change after creation. */
export interface PostPatch {
  status?: LostFoundPost["status"];
  image?: LostFoundPost["image"];
  updatedAt?: string;
}

export interface ClaimPatch {
  status: ClaimStatus;
  decidedAt: string;
}

export interface MatchCandidateQuery {
  category: PostCategory;
  excludeAuthorId: string;
  from: Date;
  through: Date;
  limit: number;
}

export type MatchCandidate = Pick<
  LostFoundPost,
  "id" | "title" | "description" | "location" | "occurredAt"
>;

/**
 * Storage contract for the Lost & Found module.
 *
 * The service only talks to this interface, so PR-2 can swap the in-memory
 * implementation for Prisma without touching a single rule or test. Every
 * write that changes more than one row MUST run inside `transaction`.
 */
export interface LostFoundRepository {
  listMatchCandidates(query: MatchCandidateQuery): Promise<MatchCandidate[]>;
  listPosts(): Promise<LostFoundPost[]>;
  getPost(id: string): Promise<LostFoundPost | null>;
  createPost(post: LostFoundPost): Promise<LostFoundPost>;
  /** An active-only update must reject if the post has ended since the caller read it. */
  updatePost(id: string, patch: PostPatch, options?: { activeOnly: true }): Promise<LostFoundPost>;

  listClaimsForPost(postId: string): Promise<LostFoundClaim[]>;
  getClaim(id: string): Promise<LostFoundClaim | null>;
  createClaim(claim: LostFoundClaim): Promise<LostFoundClaim>;
  updateClaim(id: string, patch: ClaimPatch): Promise<LostFoundClaim>;
  /** How many claims the author has not answered yet. */
  countPendingClaims(postId: string): Promise<number>;
  /** Claim counts for a batch of posts, so the list page is one query. */
  countClaims(postIds: readonly string[]): Promise<Map<string, number>>;

  transaction<T>(work: (tx: LostFoundRepository) => Promise<T>): Promise<T>;
}
