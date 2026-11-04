import { MapPin } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { PageContainer, TopBar } from "@/components/layout";
import { Skeleton, StatusBadge, TypeTag } from "@/components/ui";
import { ClaimPanel, PostOwnerActions, formatDisplayName } from "@/features/lost-found";
import { getCurrentViewer, getLostFoundRuntime } from "@/features/lost-found/server";
import { formatDate, formatTime } from "@/lib/time";

export const metadata: Metadata = { title: "Post" };

type Params = Promise<{ id: string }>;

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

async function PostDetailBody({ params }: { params: Params }) {
  await connection();
  const { id } = await params;
  const { service } = getLostFoundRuntime();
  const viewer = await getCurrentViewer();

  let detail;
  try {
    detail = await service.getPost(id);
  } catch {
    notFound();
  }

  const { post, claims } = detail;
  const isAuthor = viewer?.id === post.authorId;
  const occurred = new Date(post.occurredAt);

  return (
    <article className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <TypeTag type={post.kind === "LOST" ? "lost" : "found"} />
          <StatusBadge kind="post" status={post.status} />
        </div>
        <h2 className="text-title">{post.title}</h2>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-body-sm text-text-muted">
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-4" aria-hidden />
            {post.location}
          </span>
          <span>
            {formatDate(occurred)} · {formatTime(occurred)}
          </span>
        </div>
        <p className="text-caption text-text-muted">
          {isAuthor ? "Posted by you" : `Posted by ${formatDisplayName(post.authorName)}`}
        </p>
      </div>

      <p className="text-body whitespace-pre-line">{post.description}</p>

      {post.image?.url ? (
        // The route answers with the stored bytes; no public/ folder involved.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.image.url}
          alt={`Photo attached to ${post.title}`}
          className="w-full rounded-md border border-border"
        />
      ) : null}

      <ClaimPanel
        post={post}
        claims={claims}
        isAuthor={isAuthor}
        canClaim={!isAuthor && post.status !== "RESOLVED" && post.status !== "CLOSED"}
      />

      {isAuthor ? <PostOwnerActions postId={post.id} status={post.status} /> : null}
    </article>
  );
}

/** PG-16. */
export default function PostDetailPage({ params }: { params: Params }) {
  return (
    <>
      <TopBar title="Post" backHref="/lost-found" />
      <PageContainer width="content" className="py-4">
        <Suspense fallback={<DetailSkeleton />}>
          <PostDetailBody params={params} />
        </Suspense>
      </PageContainer>
    </>
  );
}
