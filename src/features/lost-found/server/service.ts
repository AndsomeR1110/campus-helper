/**
 * Lost & Found service: the only place that reads or writes the store.
 *
 * Pages call the queries; API route handlers call the mutations. Every mutation
 * re-checks permission and state on the server (PRD §9, CONTRIBUTING §6: never
 * trust a client-supplied status).
 */
import { filterPosts, sortPostsByNewest } from "../filters";
import {
  canClaimPost,
  canClosePost,
  canDecideClaim,
  canHidePost,
  canReadClaims,
  canViewPost,
  claimStatusesAfterAccept,
  statusAfterClaimRejected,
  type RuleResult,
} from "../rules";
import type {
  LostFoundClaim,
  LostFoundPost,
  PostDetail,
  PostFilters,
  PostListItem,
  PostStatus,
  Viewer,
} from "../types";
import { validateClaimInput, validatePostInput } from "../validation";
import { conflict, forbidden, notFound, validationError } from "./errors";
import { nextId, store } from "./store";

function ruleError(result: RuleResult): never {
  if (result.ok) throw new Error("ruleError called with a successful rule");
  if (result.code === "NOT_FOUND") throw notFound(result.message);
  if (result.code === "FORBIDDEN") throw forbidden(result.message);
  throw conflict("CONFLICT", result.message);
}

function assertAllowed(result: RuleResult): void {
  if (!result.ok) ruleError(result);
}

function findPost(id: string): LostFoundPost | undefined {
  return store.posts.find((post) => post.id === id);
}

export function requirePost(id: string): LostFoundPost {
  const post = findPost(id);
  if (!post) throw notFound();
  return post;
}

function claimCountFor(postId: string): number {
  return store.claims.filter((claim) => claim.postId === postId).length;
}

function toListItem(post: LostFoundPost): PostListItem {
  return { ...post, claimCount: claimCountFor(post.id) };
}

function replacePost(post: LostFoundPost, patch: Partial<LostFoundPost>): LostFoundPost {
  const index = store.posts.findIndex((candidate) => candidate.id === post.id);
  if (index === -1) throw notFound();
  const next: LostFoundPost = { ...post, ...patch, updatedAt: new Date().toISOString() };
  store.posts[index] = next;
  return next;
}

function replaceClaim(claim: LostFoundClaim, patch: Partial<LostFoundClaim>): LostFoundClaim {
  const index = store.claims.findIndex((candidate) => candidate.id === claim.id);
  if (index === -1) throw notFound("This claim is no longer available.");
  const next: LostFoundClaim = { ...claim, ...patch };
  store.claims[index] = next;
  return next;
}

/* ---- Queries ------------------------------------------------------------ */

/** Public list: hidden posts stay hidden for everyone except their author and admins. */
export function listPosts(filters: PostFilters, viewer: Viewer): PostListItem[] {
  const visible = store.posts.filter((post) => canViewPost(post, viewer));
  return filterPosts(visible, filters).map(toListItem);
}

/** My Posts (FR-LF-07): the viewer's own posts, including hidden ones. */
export function listMyPosts(viewer: Viewer): PostListItem[] {
  return sortPostsByNewest(store.posts.filter((post) => post.authorId === viewer.id)).map(
    toListItem,
  );
}

/** Detail page. `claims` is null for anyone who may not read private text (LF-AC-06). */
export function getPostDetail(id: string, viewer: Viewer): PostDetail | null {
  const post = findPost(id);
  if (!post || !canViewPost(post, viewer)) return null;
  const claims = store.claims.filter((claim) => claim.postId === id);
  return {
    post,
    claimCount: claims.length,
    claims: canReadClaims(post, viewer) ? claims : null,
  };
}

/** Used by the admin module to show a reported post. */
export function getPostForModeration(id: string, viewer: Viewer): LostFoundPost | null {
  if (viewer.role !== "ADMIN") return null;
  return findPost(id) ?? null;
}

/* ---- Mutations ---------------------------------------------------------- */

/** FR-LF-02, LF-AC-01/02/03: the server validates again even if the form did. */
export function createPost(input: unknown, viewer: Viewer): LostFoundPost {
  const parsed = validatePostInput(input);
  if (!parsed.ok) throw validationError(parsed.errors);

  const now = new Date().toISOString();
  const post: LostFoundPost = {
    id: nextId("post"),
    kind: parsed.value.kind,
    status: "OPEN",
    title: parsed.value.title,
    category: parsed.value.category,
    location: parsed.value.location,
    occurredAt: parsed.value.occurredAt,
    description: parsed.value.description,
    image: parsed.value.image,
    authorId: viewer.id,
    authorName: viewer.name,
    createdAt: now,
    updatedAt: now,
  };
  store.posts.unshift(post);
  return post;
}

/** FR-LF-05, LF-AC-05: anyone except the author may claim a post that is still open. */
export function submitClaim(postId: string, input: unknown, viewer: Viewer): LostFoundClaim {
  const post = requirePost(postId);
  assertAllowed(canClaimPost(post, viewer));

  const parsed = validateClaimInput(input);
  if (!parsed.ok) throw validationError(parsed.errors);

  const claim: LostFoundClaim = {
    id: nextId("claim"),
    postId: post.id,
    claimantId: viewer.id,
    claimantName: viewer.name,
    message: parsed.value.message,
    status: "PENDING",
    createdAt: new Date().toISOString(),
    decidedAt: null,
  };
  store.claims.push(claim);

  if (post.status === "OPEN") replacePost(post, { status: "CLAIM_PENDING" });
  return claim;
}

/** FR-LF-06: the author accepts or rejects a pending claim. */
export function decideClaim(
  claimId: string,
  decision: "ACCEPT" | "REJECT",
  viewer: Viewer,
): LostFoundClaim {
  const claim = store.claims.find((candidate) => candidate.id === claimId);
  if (!claim) throw notFound("This claim is no longer available.");
  const post = requirePost(claim.postId);
  assertAllowed(canDecideClaim(post, claim, viewer));

  const now = new Date().toISOString();
  if (decision === "ACCEPT") {
    const statuses = claimStatusesAfterAccept(
      store.claims.filter((candidate) => candidate.postId === post.id),
      claim.id,
    );
    for (const candidate of [...store.claims]) {
      const nextStatus = statuses.get(candidate.id);
      if (nextStatus) replaceClaim(candidate, { status: nextStatus, decidedAt: now });
    }
    replacePost(post, { status: "RESOLVED" });
    return store.claims.find((candidate) => candidate.id === claim.id) ?? claim;
  }

  const rejected = replaceClaim(claim, { status: "REJECTED", decidedAt: now });
  const stillPending = store.claims.filter(
    (candidate) => candidate.postId === post.id && candidate.status === "PENDING",
  ).length;
  replacePost(post, { status: statusAfterClaimRejected(stillPending) });
  return rejected;
}

/** The author closes their own post, as Resolved or Closed (PRD §9.1). */
export function setPostStatus(
  postId: string,
  status: Extract<PostStatus, "RESOLVED" | "CLOSED">,
  viewer: Viewer,
): LostFoundPost {
  const post = requirePost(postId);
  assertAllowed(canClosePost(post, viewer));

  if (status === "RESOLVED") {
    const now = new Date().toISOString();
    for (const claim of store.claims) {
      if (claim.postId === post.id && claim.status === "PENDING") {
        replaceClaim(claim, { status: "REJECTED", decidedAt: now });
      }
    }
  }
  return replacePost(post, { status });
}

/** Admin moderation (FR-LF-08, LF-AC-09). Called by the admin module. */
export function hidePost(postId: string, viewer: Viewer): LostFoundPost {
  const post = requirePost(postId);
  assertAllowed(canHidePost(post, viewer));
  return replacePost(post, { status: "HIDDEN" });
}

/** Admin only: restore a hidden post after a dismissed report. */
export function unhidePost(postId: string, viewer: Viewer): LostFoundPost {
  if (viewer.role !== "ADMIN") throw forbidden("Only administrators can moderate posts.");
  const post = requirePost(postId);
  if (post.status !== "HIDDEN") throw conflict("CONFLICT", "This post is not hidden.");
  return replacePost(post, { status: "OPEN" });
}

/** Re-exported so the admin module can label a report with the post title. */
export function getPostSummary(
  postId: string,
): Pick<LostFoundPost, "id" | "title" | "kind"> | null {
  const post = findPost(postId);
  return post ? { id: post.id, title: post.title, kind: post.kind } : null;
}
