// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import { mei, wei } from "../__tests__/fixtures";
import type { LostFoundPost } from "../types";
import { findMatches, type RankMatches } from "./matching";
import { createMemoryRepository } from "./memory-repository";

const lost: LostFoundPost = {
  id: "lost",
  authorId: wei.id,
  authorName: wei.name,
  kind: "LOST",
  category: "ELECTRONICS",
  title: "Black earbud case",
  description: "Contact test@example.com or +86 139 0000 0000.",
  location: "D-425",
  occurredAt: "2026-11-03T10:00:00.000Z",
  status: "OPEN",
  image: { name: "item.png", type: "image/png", size: 12 },
  createdAt: "2026-11-03T10:00:00.000Z",
  updatedAt: "2026-11-03T10:00:00.000Z",
};

function found(id: string, patch: Partial<LostFoundPost> = {}): LostFoundPost {
  return {
    ...lost,
    id,
    authorId: mei.id,
    authorName: mei.name,
    kind: "FOUND",
    title: "Dark Bluetooth charging dock",
    description: "Picked up by the stairs.",
    location: "Building D",
    ...patch,
  };
}

describe("Lost & Found AI matching", () => {
  it("rejects visitors, non-owners, Found posts and inactive Lost posts before ranking (LF-AI-AC-01)", async () => {
    const repository = createMemoryRepository({
      posts: [lost, found("found"), { ...lost, id: "closed", status: "CLOSED" }],
    });
    const rank = vi.fn<RankMatches>();
    await expect(findMatches(repository, null, lost.id, rank)).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    });
    for (const [viewer, id] of [
      [mei, lost.id],
      [mei, "found"],
      [wei, "closed"],
    ] as const) {
      await expect(findMatches(repository, viewer, id, rank)).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    }
    expect(rank).not.toHaveBeenCalled();
  });

  it("filters and prioritizes candidates and sends only redacted item data (LF-AI-AC-01, LF-AI-AC-04)", async () => {
    const repository = createMemoryRepository({
      posts: [
        lost,
        found("far", { location: "Building A" }),
        found("same-building"),
        found("exact", { location: "D-425" }),
        found("hidden", { status: "HIDDEN" }),
        found("resolved", { status: "RESOLVED" }),
        found("self", { authorId: wei.id }),
        found("old", { occurredAt: "2026-11-01T09:00:00.000Z" }),
        found("keys", { category: "KEYS" }),
        found("returned", { status: "CLAIM_PENDING" }),
      ],
    });
    await repository.createClaim({
      id: "claim",
      postId: "returned",
      claimantId: wei.id,
      claimantName: wei.name,
      message: "Private proof",
      status: "APPROVED",
      createdAt: lost.createdAt,
      decidedAt: lost.createdAt,
    });

    const rank = vi.fn<RankMatches>().mockResolvedValue({ matches: [] });
    await expect(findMatches(repository, wei, lost.id, rank)).resolves.toEqual([]);
    const [source, candidates] = rank.mock.calls[0]!;
    expect(source).toEqual({
      title: lost.title,
      location: lost.location,
      description: "Contact [redacted] or [redacted].",
      occurredAt: lost.occurredAt,
    });
    expect(candidates.map(({ candidate, location }) => [candidate, location])).toEqual([
      [1, "D-425"],
      [2, "Building D"],
      [3, "Building A"],
    ]);
    expect(Object.keys(candidates[0]!).sort()).toEqual([
      "candidate",
      "description",
      "location",
      "occurredAt",
      "title",
    ]);
  });

  it("caps and deduplicates suggestions and discards fabricated or newly hidden posts (LF-AI-AC-02)", async () => {
    const posts = ["a", "b", "c", "d", "e"].map((id) => found(id));
    const repository = createMemoryRepository({ posts: [lost, ...posts] });
    const rank: RankMatches = async () => {
      await repository.updatePost("a", { status: "HIDDEN" });
      return {
        matches: [99, 1, 3, 3, 2, 4, 5].map((candidate) => ({
          candidate,
          reason: "Similar description and location.",
        })),
      };
    };
    const matches = await findMatches(repository, wei, lost.id, rank);
    expect(matches.map(({ postId, reason }) => [postId, reason])).toEqual(
      ["c", "b", "d"].map((id) => [id, "Similar description and location."]),
    );
  });

  it("returns an empty result without calling the provider when there are no candidates (LF-AI-AC-03)", async () => {
    const rank = vi.fn<RankMatches>();
    const repository = createMemoryRepository({ posts: [lost] });
    await expect(findMatches(repository, wei, lost.id, rank)).resolves.toEqual([]);
    expect(rank).not.toHaveBeenCalled();
  });

  it("rejects malformed reasons instead of returning invalid results (LF-AI-AC-02)", async () => {
    const repository = createMemoryRepository({ posts: [lost, found("a")] });
    const rank: RankMatches = async () => ({ matches: [{ candidate: 1, reason: "  " }] });
    await expect(findMatches(repository, wei, lost.id, rank)).rejects.toThrow();
  });
});
