import { byNewestFirst, matchesFilters } from "../filters";
import {
  canDecideClaimForPost,
  canReadClaims,
  canSetPostStatus,
  canSubmitClaim,
  canViewPost,
  claimStatusesAfterAccept,
  LostFoundError,
  postStatusAfterReject,
  requireViewer,
} from "../rules";
import type {
  LostFoundClaim,
  LostFoundPost,
  NewClaimInput,
  NewPostInput,
  PostDetail,
  PostFilters,
  PostListItem,
  PostSummary,
  Viewer,
} from "../types";
import { validateImageUpload } from "../image";
import type { LostFoundRepository } from "./repository";
import type { ImageStorage } from "./storage";

export interface LostFoundServiceDeps {
  repository: LostFoundRepository;
  /** Session adapter; returns null until `feat/auth-and-roles` is merged. */
  currentViewer: () => Promise<Viewer | null>;
  now: () => Date;
  nextId: () => string;
  /** Omitted by the storage-agnostic rule tests; `attachImage` needs it. */
  storage?: ImageStorage;
}

/**
 * Composition root of the module: rules own the decisions, the repository owns
 * storage, this service is the only thing pages and route handlers call.
 *
 * Everything that depends on "who is asking" goes through `currentViewer`, so a
 * test can call the same service with a different viewer and assert LF-AC-06
 * (private claims) and LF-AC-08 (foreign posts are read-only) without a server.
 */
export function createLostFoundService({
  repository,
  currentViewer,
  now,
  nextId,
  storage,
}: LostFoundServiceDeps) {
  function isListed(post: LostFoundPost): boolean {
    // Hidden posts disappear from browse and from "My posts". The author keeps
    // them reachable through the detail page, which is enough for the notice.
    return post.status !== "HIDDEN";
  }

  return {
    /** Public list with search, kind and category filters applied. */
    async listPosts(filters: PostFilters): Promise<PostListItem[]> {
      const viewer = await currentViewer();
      const posts = (await repository.listPosts())
        .filter(isListed)
        .filter((post) => canViewPost(post, viewer) && matchesFilters(post, filters))
        .sort(byNewestFirst);
      const counts = await repository.countClaims(posts.map((post) => post.id));
      return posts.map((post) => ({ ...post, claimCount: counts.get(post.id) ?? 0 }));
    },

    async listMyPosts(): Promise<PostListItem[]> {
      const viewer = requireViewer(await currentViewer());
      const mine = (await repository.listPosts())
        .filter((post) => post.authorId === viewer.id)
        .sort(byNewestFirst);
      const counts = await repository.countClaims(mine.map((post) => post.id));
      return mine.map((post) => ({ ...post, claimCount: counts.get(post.id) ?? 0 }));
    },

    /** `null` claims mean "you may not read them", not "there are none". */
    async getPost(postId: string): Promise<PostDetail> {
      const viewer = await currentViewer();
      const post = await repository.getPost(postId);
      if (!post || !canViewPost(post, viewer)) {
        throw new LostFoundError("NOT_FOUND", "This post is not available.");
      }
      const claims = canReadClaims(post, viewer)
        ? await repository.listClaimsForPost(postId)
        : null;
      const claimCount = claims
        ? claims.length
        : ((await repository.countClaims([postId])).get(postId) ?? 0);
      return { post, claimCount, claims };
    },

    async createPost(input: NewPostInput): Promise<LostFoundPost> {
      const viewer = requireViewer(await currentViewer());
      const at = now();
      const occurredAt = new Date(input.occurredAt);
      if (Number.isNaN(occurredAt.getTime())) {
        throw new LostFoundError("VALIDATION_ERROR", "Use a valid date and time.");
      }
      if (occurredAt.getTime() > at.getTime()) {
        throw new LostFoundError("VALIDATION_ERROR", "The date cannot be in the future.");
      }

      const timestamp = at.toISOString();
      return repository.createPost({
        id: nextId(),
        authorId: viewer.id,
        authorName: viewer.name,
        kind: input.kind,
        category: input.category,
        title: input.title,
        description: input.description,
        location: input.location,
        occurredAt: occurredAt.toISOString(),
        status: "OPEN",
        image: input.image,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    },

    async submitClaim(postId: string, input: NewClaimInput): Promise<LostFoundClaim> {
      const viewer = requireViewer(await currentViewer());
      const post = await repository.getPost(postId);
      if (!post || !canViewPost(post, viewer)) {
        throw new LostFoundError("NOT_FOUND", "This post is not available.");
      }
      if (!canSubmitClaim(post, viewer)) {
        throw new LostFoundError("FORBIDDEN", "This item cannot be claimed right now.");
      }

      const existing = await repository.listClaimsForPost(postId);
      if (existing.some((claim) => claim.status === "APPROVED")) {
        throw new LostFoundError("FORBIDDEN", "This item has already been claimed.");
      }
      const mine = existing.find(
        (claim) => claim.claimantId === viewer.id && claim.status === "PENDING",
      );
      if (mine) throw new LostFoundError("CONFLICT", "You already sent a claim for this item.");

      const at = now().toISOString();
      const claim: LostFoundClaim = {
        id: nextId(),
        postId,
        claimantId: viewer.id,
        claimantName: viewer.name,
        message: input.message,
        status: "PENDING",
        createdAt: at,
        decidedAt: null,
      };

      return repository.transaction(async (tx) => {
        const created = await tx.createClaim(claim);
        if (post.status === "OPEN")
          await tx.updatePost(postId, { status: "CLAIM_PENDING", updatedAt: at });
        return created;
      });
    },

    /**
     * Accepting a claim hands the item over but does not finish the post: the
     * author still marks it RESOLVED after the actual handover (FR-LF-06).
     */
    async decideClaim(
      claimId: string,
      decision: "ACCEPT" | "REJECT",
    ): Promise<{ claim: LostFoundClaim; post: LostFoundPost }> {
      const viewer = requireViewer(await currentViewer());
      const claim = await repository.getClaim(claimId);
      if (!claim) throw new LostFoundError("NOT_FOUND", "This claim is not available.");
      const post = await repository.getPost(claim.postId);
      if (!post || !canViewPost(post, viewer)) {
        throw new LostFoundError("NOT_FOUND", "This claim is not available.");
      }
      if (!canDecideClaimForPost(post, claim, viewer)) {
        throw new LostFoundError("FORBIDDEN", "Only the author can answer this claim.");
      }

      const at = now().toISOString();
      return repository.transaction(async (tx) => {
        if (decision === "ACCEPT") {
          const siblings = await tx.listClaimsForPost(post.id);
          if (siblings.some((sibling) => sibling.id !== claimId && sibling.status === "APPROVED")) {
            throw new LostFoundError("FORBIDDEN", "This item has already been claimed.");
          }
          for (const [id, status] of claimStatusesAfterAccept(siblings, claimId)) {
            if (id === claimId) continue;
            await tx.updateClaim(id, { status, decidedAt: at });
          }
          const accepted = await tx.updateClaim(claimId, { status: "APPROVED", decidedAt: at });
          const updated = await tx.updatePost(post.id, { status: "CLAIM_PENDING", updatedAt: at });
          return { claim: accepted, post: updated };
        }

        const rejected = await tx.updateClaim(claimId, { status: "REJECTED", decidedAt: at });
        const remaining = await tx.countPendingClaims(post.id);
        const updated = await tx.updatePost(post.id, {
          status: postStatusAfterReject(remaining),
          updatedAt: at,
        });
        return { claim: rejected, post: updated };
      });
    },

    /** The author closes the loop: RESOLVED after the handover, or CLOSED. */
    async setPostStatus(postId: string, next: "RESOLVED" | "CLOSED"): Promise<LostFoundPost> {
      const viewer = requireViewer(await currentViewer());
      const post = await repository.getPost(postId);
      if (!post || !canViewPost(post, viewer)) {
        throw new LostFoundError("NOT_FOUND", "This post is not available.");
      }
      if (!canSetPostStatus(post, viewer, next)) {
        throw new LostFoundError("FORBIDDEN", "Only the author can change this post.");
      }
      return repository.updatePost(postId, { status: next, updatedAt: now().toISOString() });
    },

    /**
     * Optional photo (LF-AC-02, LF-AC-03). The bytes are sniffed, stored outside
     * `public/` and only their URL is kept in the post row; replacing a photo
     * removes the previous file so the demo folder does not grow forever.
     */
    async attachImage(
      postId: string,
      upload: { name: string; declaredType: string; bytes: Uint8Array },
    ): Promise<LostFoundPost> {
      const viewer = requireViewer(await currentViewer());
      const post = await repository.getPost(postId);
      if (!post || !canViewPost(post, viewer)) {
        throw new LostFoundError("NOT_FOUND", "This post is not available.");
      }
      if (post.authorId !== viewer.id) {
        throw new LostFoundError("FORBIDDEN", "Only the author can add a photo.");
      }
      if (!storage) throw new Error("No image storage configured.");

      const type = validateImageUpload({
        declaredType: upload.declaredType,
        size: upload.bytes.byteLength,
        bytes: upload.bytes,
      });
      const key = nextId();
      const url = await storage.put(key, upload.bytes, type);
      const image = { name: upload.name.slice(0, 120), type, size: upload.bytes.byteLength, url };

      const previous = post.image?.url?.split("/").pop();
      if (previous) await storage.remove(previous);

      return repository.updatePost(postId, { image, updatedAt: now().toISOString() });
    },

    /** Narrow view for moderation: no claims, no description. */
    async getPostSummary(postId: string): Promise<PostSummary | null> {
      const post = await repository.getPost(postId);
      if (!post || post.status === "HIDDEN") return null;
      return {
        id: post.id,
        title: post.title,
        kind: post.kind,
        status: post.status,
        authorId: post.authorId,
      };
    },

    /** Only the admin service calls this, after it has checked the actor. */
    async hidePostAsModerator(postId: string): Promise<LostFoundPost> {
      const post = await repository.getPost(postId);
      if (!post) throw new LostFoundError("NOT_FOUND", "This post does not exist.");
      if (post.status === "HIDDEN") return post;
      return repository.updatePost(postId, { status: "HIDDEN", updatedAt: now().toISOString() });
    },
  };
}

export type LostFoundService = ReturnType<typeof createLostFoundService>;
