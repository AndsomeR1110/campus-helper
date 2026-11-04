import { LostFoundError } from "@/features/lost-found";
import type { Viewer } from "@/features/lost-found";

/**
 * Moderation rules, kept as plain functions so the tests can call them without a
 * service. The only rule that matters for LF-AC-09 is: an administrator and
 * nobody else decides a report.
 */
export function isAdmin(viewer: Viewer | null): boolean {
  return viewer?.role === "ADMIN";
}

export function requireModerator(viewer: Viewer | null): Viewer {
  if (!viewer) {
    throw new LostFoundError("UNAUTHENTICATED", "Sign in to moderate reports.");
  }
  if (!isAdmin(viewer)) {
    throw new LostFoundError("FORBIDDEN", "Only administrators can moderate reports.");
  }
  return viewer;
}

export function requireReporter(viewer: Viewer | null): Viewer {
  if (!viewer) {
    throw new LostFoundError("UNAUTHENTICATED", "Sign in to report a post.");
  }
  return viewer;
}

/** A report can only be decided while it is pending. */
export function canDecideReport(status: string): boolean {
  return status === "PENDING";
}

/** Authors cannot report their own posts, and hidden posts are already dealt with. */
export function canReportPost(
  viewer: Viewer,
  post: { authorId: string; status: string },
): { allowed: true } | { allowed: false; reason: string } {
  if (viewer.id === post.authorId) {
    return { allowed: false, reason: "You cannot report your own post." };
  }
  if (post.status === "HIDDEN") {
    return { allowed: false, reason: "This post is no longer visible." };
  }
  return { allowed: true };
}
