import { MapPin, MessageSquare } from "lucide-react";
import Link from "next/link";

import { StatusBadge, TypeTag, cardStyles } from "@/components/ui";
import { formatDate, formatTime } from "@/lib/time";

import { CATEGORY_LABELS } from "../constants";
import type { PostListItem } from "../types";

/** One row of PG-14 and PG-17. */
export function PostCard({ post }: { post: PostListItem }) {
  const occurred = new Date(post.occurredAt);
  return (
    <Link
      href={`/lost-found/${post.id}`}
      className={cardStyles({ interactive: true, className: "flex flex-col gap-3" })}
    >
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

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-caption text-text-muted">
        <span>{CATEGORY_LABELS[post.category]}</span>
        <span className="inline-flex items-center gap-1">
          <MapPin className="size-3.5" aria-hidden />
          {post.location}
        </span>
        <span>
          {formatDate(occurred)} · {formatTime(occurred)}
        </span>
      </div>
    </Link>
  );
}
