import { describe, expect, it } from "vitest";

import {
  byNewestFirst,
  describeFilters,
  hasActiveFilters,
  matchesFilters,
  parsePostFilters,
  toSearchString,
} from "../filters";
import type { LostFoundPost } from "../types";

function post(overrides: Partial<LostFoundPost> = {}): LostFoundPost {
  return {
    id: "post-1",
    authorId: "u-1001",
    authorName: "Wei Chen",
    kind: "FOUND",
    category: "ELECTRONICS",
    title: "AirPods case",
    description: "White charging case left on the last desk.",
    location: "Building C, room 204",
    occurredAt: "2026-11-01T09:00:00.000Z",
    status: "OPEN",
    image: null,
    createdAt: "2026-11-01T09:05:00.000Z",
    updatedAt: "2026-11-01T09:05:00.000Z",
    ...overrides,
  };
}

describe("parsePostFilters (LF-AC-04)", () => {
  it("keeps the three supported filters", () => {
    expect(parsePostFilters({ q: " card ", kind: "lost", category: "campus_card" })).toEqual({
      query: "card",
      kind: "LOST",
      category: "CAMPUS_CARD",
    });
  });

  it("drops unknown values instead of forwarding them", () => {
    expect(parsePostFilters({ kind: "SOLD", category: "FOOD", q: "  " })).toEqual({});
    expect(parsePostFilters({})).toEqual({});
  });

  it("takes the first value of a repeated parameter and caps the query length", () => {
    expect(parsePostFilters({ category: ["KEYS", "BOOKS"] })).toEqual({ category: "KEYS" });
    expect(parsePostFilters({ q: "x".repeat(200) }).query).toHaveLength(80);
  });
});

describe("matchesFilters", () => {
  it("matches case-insensitively across title, description and location", () => {
    expect(matchesFilters(post(), { query: "AIRPODS" })).toBe(true);
    expect(matchesFilters(post(), { query: "charging" })).toBe(true);
    expect(matchesFilters(post(), { query: "room 204" })).toBe(true);
    expect(matchesFilters(post(), { query: "bottle" })).toBe(false);
  });

  it("combines kind, category and query as AND", () => {
    expect(matchesFilters(post(), { kind: "FOUND", category: "ELECTRONICS" })).toBe(true);
    expect(matchesFilters(post(), { kind: "LOST", category: "ELECTRONICS" })).toBe(false);
    expect(matchesFilters(post(), { category: "ELECTRONICS", query: "keys" })).toBe(false);
  });

  it("treats an empty filter object as 'everything'", () => {
    expect(matchesFilters(post(), {})).toBe(true);
    expect(hasActiveFilters({})).toBe(false);
    expect(hasActiveFilters({ query: "x" })).toBe(true);
  });
});

describe("ordering and URL round-trip", () => {
  it("sorts newest first and breaks ties by id", () => {
    const older = post({ id: "a", createdAt: "2026-10-01T00:00:00.000Z" });
    const newer = post({ id: "b", createdAt: "2026-11-01T00:00:00.000Z" });
    expect([older, newer].sort(byNewestFirst).map((item) => item.id)).toEqual(["b", "a"]);

    const tieA = post({ id: "a", createdAt: "2026-11-01T00:00:00.000Z" });
    const tieB = post({ id: "b", createdAt: "2026-11-01T00:00:00.000Z" });
    expect([tieA, tieB].sort(byNewestFirst).map((item) => item.id)).toEqual(["b", "a"]);
  });

  it("rebuilds a stable query string", () => {
    expect(toSearchString({})).toBe("");
    expect(toSearchString({ kind: "LOST" })).toBe("?kind=LOST");
    const filters = { query: "blue bottle", kind: "FOUND" as const };
    expect(toSearchString(filters)).toBe("?q=blue+bottle&kind=FOUND");
    expect(
      parsePostFilters(Object.fromEntries(new URLSearchParams(toSearchString(filters)))),
    ).toEqual(filters);
  });

  it("describes an active filter for the empty state", () => {
    expect(describeFilters({ query: "bottle", kind: "FOUND" })).toBe("“bottle” · Found");
    expect(describeFilters({})).toBe("");
  });
});
