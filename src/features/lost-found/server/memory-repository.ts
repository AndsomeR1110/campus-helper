import type { LostFoundClaim, LostFoundPost } from "../types";
import { LostFoundError } from "../rules";
import type { ClaimPatch, LostFoundRepository, PostPatch } from "./repository";

/**
 * In-memory repository used by the unit tests and by `pnpm dev` before the
 * database migration lands (PR-2). It is NOT production storage: a restart or a
 * second server instance loses every write, which is what #31 asks PR-2 to fix.
 *
 * `transaction` simply runs the callback — the memory store has no concurrent
 * writers to serialise, the Prisma implementation will use `$transaction`.
 */
export function createMemoryRepository(seed: { posts: LostFoundPost[] }): LostFoundRepository {
  const posts = new Map<string, LostFoundPost>(seed.posts.map((post) => [post.id, post]));
  const claims = new Map<string, LostFoundClaim>();

  const repository: LostFoundRepository = {
    async listPosts() {
      return [...posts.values()].map(clonePost);
    },

    async getPost(id) {
      const post = posts.get(id);
      return post ? clonePost(post) : null;
    },

    async createPost(post) {
      if (posts.has(post.id)) throw new LostFoundError("CONFLICT", "Post id already exists.");
      posts.set(post.id, clonePost(post));
      return clonePost(post);
    },

    async updatePost(id, patch: PostPatch) {
      const current = posts.get(id);
      if (!current) throw new LostFoundError("NOT_FOUND", "Post not found.");
      const next: LostFoundPost = { ...current, ...patch };
      posts.set(id, next);
      return clonePost(next);
    },

    async listClaimsForPost(postId) {
      return [...claims.values()].filter((claim) => claim.postId === postId).map(cloneClaim);
    },

    async getClaim(id) {
      const claim = claims.get(id);
      return claim ? cloneClaim(claim) : null;
    },

    async createClaim(claim) {
      if (claims.has(claim.id)) throw new LostFoundError("CONFLICT", "Claim id already exists.");
      claims.set(claim.id, cloneClaim(claim));
      return cloneClaim(claim);
    },

    async updateClaim(id, patch: ClaimPatch) {
      const current = claims.get(id);
      if (!current) throw new LostFoundError("NOT_FOUND", "Claim not found.");
      const next: LostFoundClaim = { ...current, ...patch };
      claims.set(id, next);
      return cloneClaim(next);
    },

    async countPendingClaims(postId) {
      return [...claims.values()].filter(
        (claim) => claim.postId === postId && claim.status === "PENDING",
      ).length;
    },

    async countClaims(postIds) {
      const wanted = new Set(postIds);
      const counts = new Map<string, number>();
      for (const postId of wanted) counts.set(postId, 0);
      for (const claim of claims.values()) {
        if (!wanted.has(claim.postId)) continue;
        counts.set(claim.postId, (counts.get(claim.postId) ?? 0) + 1);
      }
      return counts;
    },

    async transaction(work) {
      return work(repository);
    },
  };

  return repository;
}

function clonePost(post: LostFoundPost): LostFoundPost {
  return { ...post, image: post.image ? { ...post.image } : null };
}

function cloneClaim(claim: LostFoundClaim): LostFoundClaim {
  return { ...claim };
}
