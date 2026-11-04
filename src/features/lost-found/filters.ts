import { kindParamSchema, categoryParamSchema } from "./schemas";
import type { PostFilters, PostKind, PostCategory, LostFoundPost } from "./types";
import { CATEGORY_LABELS, POST_KIND_LABELS } from "./constants";

/**
 * Filtering lives in the URL (`/lost-found?kind=LOST&category=KEYS&q=card`) so a
 * filtered list can be shared and survives a refresh, as the architecture doc
 * requires. Parsing therefore has to tolerate garbage: an unknown value is
 * dropped, never forwarded to the database.
 */

export type SearchParamsLike = Record<string, string | string[] | undefined>;

const MAX_QUERY_LENGTH = 80;

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export function parsePostFilters(params: SearchParamsLike): PostFilters {
  const filters: PostFilters = {};

  const rawQuery = first(params.q);
  if (rawQuery) {
    const query = rawQuery.trim().slice(0, MAX_QUERY_LENGTH);
    if (query) filters.query = query;
  }

  const rawKind = first(params.kind)?.toUpperCase();
  const kind = kindParamSchema.safeParse(rawKind);
  if (kind.success) filters.kind = kind.data as PostKind;

  const rawCategory = first(params.category)?.toUpperCase();
  const category = categoryParamSchema.safeParse(rawCategory);
  if (category.success) filters.category = category.data as PostCategory;

  return filters;
}

export function hasActiveFilters(filters: PostFilters): boolean {
  return Boolean(filters.query || filters.kind || filters.category);
}

/** Rebuilds the query string so `/lost-found?…` stays canonical and ordered. */
export function toSearchString(filters: PostFilters): string {
  const params = new URLSearchParams();
  if (filters.query) params.set("q", filters.query);
  if (filters.kind) params.set("kind", filters.kind);
  if (filters.category) params.set("category", filters.category);
  const query = params.toString();
  return query ? `?${query}` : "";
}

/** Case-insensitive match over the three fields a visitor would type. */
export function matchesFilters(post: LostFoundPost, filters: PostFilters): boolean {
  if (filters.kind && post.kind !== filters.kind) return false;
  if (filters.category && post.category !== filters.category) return false;
  if (!filters.query) return true;

  const needle = filters.query.toLowerCase();
  const haystack = `${post.title} ${post.description} ${post.location}`.toLowerCase();
  return haystack.includes(needle);
}

/** Newest first; `id` breaks ties so the order is stable across pages. */
export function byNewestFirst(a: LostFoundPost, b: LostFoundPost): number {
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
  return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
}

export function describeFilters(filters: PostFilters): string {
  const parts: string[] = [];
  if (filters.query) parts.push(`“${filters.query}”`);
  if (filters.kind) parts.push(POST_KIND_LABELS[filters.kind]);
  if (filters.category) parts.push(CATEGORY_LABELS[filters.category]);
  return parts.join(" · ");
}
