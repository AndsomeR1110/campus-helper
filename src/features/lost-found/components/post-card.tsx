import { MessageSquare } from "lucide-react";
import Link from "next/link";

import {
  LocationText,
  StatusBadge,
  TypeIcon,
  TypeTag,
  cardStyles,
  typeColorClasses,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import { formatDate, formatTime } from "@/lib/time";

import { CATEGORY_LABELS } from "../constants";
import type { PostListItem } from "../types";

/** One row of PG-14 and PG-17. */
export function PostCard({ post }: { post: PostListItem }) {
  const occurred = new Date(post.occurredAt);
  return (
    <Link
      href={`/lost-found/${post.id}`}
      className={cardStyles({ interactive: true, className: "flex gap-3" })}
    >
      <span
        aria-hidden
        className={cn(
          "flex size-12 shrink-0 items-center justify-center rounded-md",
          typeColorClasses(post.kind === "LOST" ? "lost" : "found"),
        )}
      >
        <TypeIcon type={post.kind === "LOST" ? "lost" : "found"} className="size-6" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <TypeTag type={post.kind === "LOST" ? "lost" : "found"} />
          <StatusBadge kind="post" status={post.status} />
          {post.claimCount > 0 && (
            <span className="ml-auto inline-flex items-center gap-1 text-caption text-text-muted">
              <MessageSquare className="size-3.5" aria-hidden />
              {post.claimCount} {post.claimCount === 1 ? "claim" : "claims"}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <h2 className="text-subtitle">{post.title}</h2>
          <p className="line-clamp-2 text-body-sm text-text-muted">{post.description}</p>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-text-muted">
          <span className="rounded-full bg-surface-muted px-2 py-0.5">
            {CATEGORY_LABELS[post.category]}
          </span>
          <LocationText location={post.location} className="max-w-full" />
          <span>
            {formatDate(occurred)} · {formatTime(occurred)}
          </span>
        </div>
      </div>
    </Link>
  );
}
