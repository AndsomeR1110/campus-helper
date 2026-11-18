import "server-only";

import { buildingFromLocation } from "@/lib/campus";

import { acceptsClaims, requireViewer, LostFoundError } from "../rules";
import { modelMatchesSchema } from "../schemas";
import type { LostFoundPost, Viewer } from "../types";
import type { MatchCandidate, LostFoundRepository } from "./repository";

const DAY_MS = 86_400_000;
const MAX_CANDIDATES = 12;
const MAX_SUGGESTIONS = 3;

type ItemText = Omit<MatchCandidate, "id">;

export type RankMatches = (
  lost: ItemText,
  candidates: (ItemText & { candidate: number })[],
) => Promise<unknown>;

export interface MatchSuggestion {
  postId: string;
  title: string;
  reason: string;
}

export function canFindMatches(post: LostFoundPost, viewer: Viewer | null): boolean {
  return post.kind === "LOST" && post.authorId === viewer?.id && acceptsClaims(post);
}

/** Remove common contact and ID strings even if someone included them in public text. */
function redact(text: string) {
  return text
    .replace(/(?:https?:\/\/|www\.)\S+/gi, "[redacted]")
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, "[redacted]")
    .replace(/\+?\d(?:[\d(). -]*\d){6,}/g, "[redacted]");
}

function itemText({ title, description, location, occurredAt }: ItemText): ItemText {
  return {
    title: redact(title),
    description: redact(description),
    location: redact(location),
    occurredAt,
  };
}

function locationRank(source: string, candidate: string): number {
  const normalize = (text: string) => text.normalize("NFKC").trim().toLowerCase();
  if (normalize(source) === normalize(candidate)) return 0;
  const building = buildingFromLocation(source);
  return building && buildingFromLocation(candidate)?.code === building.code ? 1 : 2;
}

export async function findMatches(
  repository: Pick<LostFoundRepository, "getPost" | "listMatchCandidates">,
  viewer: Viewer | null,
  postId: string,
  rank: RankMatches,
): Promise<MatchSuggestion[]> {
  const current = requireViewer(viewer);
  const post = await repository.getPost(postId);
  if (!post || !canFindMatches(post, current)) {
    throw new LostFoundError("NOT_FOUND", "This lost post is not available for matching.");
  }
  const lostAt = Date.parse(post.occurredAt);
  const query = {
    category: post.category,
    excludeAuthorId: current.id,
    from: new Date(lostAt - DAY_MS),
    through: new Date(lostAt + 14 * DAY_MS),
    limit: 60,
  };
  const candidates = (await repository.listMatchCandidates(query))
    .map((candidate) => ({
      candidate,
      proximity: locationRank(post.location, candidate.location),
      distance: Math.abs(Date.parse(candidate.occurredAt) - lostAt),
    }))
    .sort((a, b) => a.proximity - b.proximity || a.distance - b.distance)
    .slice(0, MAX_CANDIDATES)
    .map(({ candidate }) => candidate);
  if (candidates.length === 0) return [];

  const output = await rank(
    itemText(post),
    candidates.map((candidate, index) => ({ candidate: index + 1, ...itemText(candidate) })),
  );
  const { matches } = modelMatchesSchema.parse(output);
  if (matches.length === 0) return [];

  // The model can take several seconds. Do not return posts removed or claimed in that time.
  const [currentSource, available] = await Promise.all([
    repository.getPost(postId),
    repository.listMatchCandidates(query),
  ]);
  if (!currentSource || !canFindMatches(currentSource, current)) return [];
  const availableById = new Map(available.map((candidate) => [candidate.id, candidate]));
  const suggestions: MatchSuggestion[] = [];
  for (const match of matches) {
    const id = candidates[match.candidate - 1]?.id;
    const candidate = id && availableById.get(id);
    if (!candidate) continue;
    suggestions.push({
      postId: candidate.id,
      title: candidate.title,
      reason: redact(match.reason),
    });
    availableById.delete(candidate.id);
    if (suggestions.length === MAX_SUGGESTIONS) break;
  }
  return suggestions;
}
