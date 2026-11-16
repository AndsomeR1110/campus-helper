"use server";

import { ApiError } from "@/lib/api";
import { createRateLimiter, enforceRateLimit } from "@/lib/rate-limit";

import { LostFoundError } from "../rules";
import { matchPostIdSchema } from "../schemas";
import { getLostFoundRuntime } from "./container";
import { createOpenAiRanker } from "./match-provider";
import { findMatches, type MatchSuggestion } from "./matching";
import { getCurrentViewer } from "./viewer";

const perUser = createRateLimiter({ limit: 5, windowMs: 10 * 60_000 });
const perServer = createRateLimiter({ limit: 30, windowMs: 60_000 });

export async function requestLostFoundMatches(
  postId: string,
): Promise<{ matches: MatchSuggestion[] } | { error: string }> {
  const id = matchPostIdSchema.safeParse(postId);
  if (!id.success) return { error: "This lost post is not available for matching." };
  const key = process.env.LOST_FOUND_AI_API_KEY?.trim();
  if (!key) return { error: "AI matching is currently unavailable." };

  try {
    const viewer = await getCurrentViewer();
    if (!viewer) return { error: "Sign in to find possible matches." };
    const rank = createOpenAiRanker(key, process.env.LOST_FOUND_AI_MODEL?.trim() || "gpt-4o-mini");
    const matches = await findMatches(
      getLostFoundRuntime().repository,
      viewer,
      id.data,
      (lost, candidates) => {
        enforceRateLimit(perUser, viewer.id);
        enforceRateLimit(perServer, "lost-found");
        perUser.hit(viewer.id);
        perServer.hit("lost-found");
        return rank(lost, candidates);
      },
    );
    return { matches };
  } catch (error) {
    if (error instanceof LostFoundError) return { error: error.message };
    if (error instanceof ApiError && error.code === "TOO_MANY_ATTEMPTS") {
      return { error: "Too many matching requests. Try again in a few minutes." };
    }
    return { error: "Could not find matches right now. Please try again." };
  }
}
