import Link from "next/link";
import { MapPin, MessageSquare } from "lucide-react";
import { cardStyles, StatusBadge, TypeTag } from "@/components/ui";
import { formatDate, formatTime } from "@/lib/time";
import { CATEGORY_LABELS } from "../constants";
import type { PostListItem } from "../types";

/** One row of the list and My Posts pages (PG-14, PG-17). */
export function PostCard({ post }: { post: PostListItem }) {
  const claims = post.claimCount === 1 ? "1 claim" : `${post.claimCount} claims`;

  return (
    <Link href={`/lost-found/${post.id}`} className={cardStyles({ interactive: true })}>
      <div className="flex flex-wrap items-center gap-2">
        <TypeTag type={post.kind === "LOST" ? "lost" : "found"} />
        <StatusBadge kind="post" status={post.status} />
      </div>
      <h3 className="mt-2 truncate text-subtitle text-text">{post.title}</h3>
      <p className="mt-1 line-clamp-2 text-body-sm text-text-muted">{post.description}</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-text-muted">
        <span>{CATEGORY_LABELS[post.category]}</span>
        <span className="inline-flex items-center gap-1">
          <MapPin className="size-3.5" aria-hidden />
          {post.location}
        </span>
        <span>
          {formatDate(post.occurredAt)} · {formatTime(post.occurredAt)}
        </span>
        {post.claimCount > 0 && (
          <span className="inline-flex items-center gap-1">
            <MessageSquare className="size-3.5" aria-hidden />
            {claims}
          </span>
        )}
      </div>
    </Link>
  );
}
