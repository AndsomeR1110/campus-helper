/**
 * Filtering and sorting for the list pages (FR-LF-03, LF-AC-04).
 * State lives in URL search params so a filtered list can be shared and
 * survives a refresh (frontend-architecture §6). Everything here is pure.
 */
import { MAX_LIST_ITEMS, POST_CATEGORIES } from "./constants";
import type { LostFoundPost, PostCategory, PostFilters, PostKind } from "./types";

export type SearchParamsLike = Record<string, string | string[] | undefined>;

export const DEFAULT_FILTERS: PostFilters = { q: "", kind: "ALL", category: "ALL" };

function firstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

/** Never trust search params: unknown or repeated values fall back to "ALL". */
export function parsePostFilters(params: SearchParamsLike): PostFilters {
  const q = firstValue(params.q).trim().slice(0, 100);

  const kindParam = firstValue(params.kind).toUpperCase();
  const kind: PostKind | "ALL" = kindParam === "LOST" || kindParam === "FOUND" ? kindParam : "ALL";

  const categoryParam = firstValue(params.category).toUpperCase();
  const category: PostCategory | "ALL" = POST_CATEGORIES.includes(categoryParam as PostCategory)
    ? (categoryParam as PostCategory)
    : "ALL";

  return { q, kind, category };
}

export function hasActiveFilters(filters: PostFilters): boolean {
  return filters.q !== "" || filters.kind !== "ALL" || filters.category !== "ALL";
}

/** Builds the query string for links such as a chip that clears one filter. */
export function toSearchString(filters: Partial<PostFilters>): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.kind && filters.kind !== "ALL") params.set("kind", filters.kind);
  if (filters.category && filters.category !== "ALL") params.set("category", filters.category);
  const query = params.toString();
  return query ? `?${query}` : "";
}

/** Keyword matches title, description and location (FR-LF-03). */
export function matchesFilters(post: LostFoundPost, filters: PostFilters): boolean {
  if (filters.kind !== "ALL" && post.kind !== filters.kind) return false;
  if (filters.category !== "ALL" && post.category !== filters.category) return false;

  const term = filters.q.toLowerCase();
  if (!term) return true;

  return (
    post.title.toLowerCase().includes(term) ||
    post.description.toLowerCase().includes(term) ||
    post.location.toLowerCase().includes(term)
  );
}

/** Newest first: a post about an item found today outranks one from last week. */
export function sortPostsByNewest<T extends LostFoundPost>(posts: readonly T[]): T[] {
  return [...posts].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export function filterPosts<T extends LostFoundPost>(
  posts: readonly T[],
  filters: PostFilters,
): T[] {
  return sortPostsByNewest(posts.filter((post) => matchesFilters(post, filters))).slice(
    0,
    MAX_LIST_ITEMS,
  );
}
