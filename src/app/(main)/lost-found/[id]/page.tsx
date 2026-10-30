import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ImageIcon, MapPin } from "lucide-react";
import { PageContainer, TopBar } from "@/components/layout";
import { DemoDataNotice, Skeleton, StatusBadge, TypeTag } from "@/components/ui";
import { formatDate, formatTime } from "@/lib/time";
import {
  CATEGORY_LABELS,
  ClaimPanel,
  canClaimPost,
  canReportPost,
  formatDisplayName,
  PostOwnerActions,
  ReportDialog,
} from "@/features/lost-found";
import { getPostDetail, getViewer } from "@/features/lost-found/server";

export const metadata: Metadata = {
  title: "Post · Campus Helper",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

/** PG-16 — Post detail (FR-LF-04/05/06, LF-AC-05/06/07). */
export default function PostDetailPage({ params }: PageProps) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <PostDetailBody params={params} />
    </Suspense>
  );
}

async function PostDetailBody({ params }: PageProps) {
  const { id } = await params;
  const viewer = getViewer();
  const detail = getPostDetail(id, viewer);
  if (!detail) notFound();

  const { post, claims } = detail;
  const isAuthor = post.authorId === viewer.id;
  const canClaim = canClaimPost(post, viewer).ok;
  const canReport = canReportPost(post, viewer).ok;

  return (
    <>
      <TopBar title={post.title} backHref="/lost-found" />
      <PageContainer width="content" className="flex flex-col gap-5 pb-10">
        <header className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <TypeTag type={post.kind === "LOST" ? "lost" : "found"} />
            <StatusBadge kind="post" status={post.status} />
            <span className="text-caption text-text-muted">{CATEGORY_LABELS[post.category]}</span>
          </div>
          <h1 className="text-title text-text">{post.title}</h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm text-text-muted">
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-4" aria-hidden />
              {post.location}
            </span>
            <span>
              {formatDate(post.occurredAt)} · {formatTime(post.occurredAt)}
            </span>
          </div>
          <p className="text-caption text-text-muted">
            Posted by {isAuthor ? "you" : formatDisplayName(post.authorName)}
          </p>
        </header>

        <p className="text-body whitespace-pre-line text-text">{post.description}</p>

        {post.image && (
          <div className="flex items-center gap-2 rounded-md bg-surface-muted px-4 py-3 text-body-sm text-text-muted">
            <ImageIcon className="size-4" aria-hidden />
            Photo “{post.image.name}” is attached. Image storage is not connected yet, so it cannot
            be shown here.
          </div>
        )}

        {isAuthor ? (
          <>
            <ClaimPanel post={post} claims={claims} isAuthor canClaim={false} />
            <PostOwnerActions postId={post.id} status={post.status} />
          </>
        ) : (
          <>
            <ClaimPanel post={post} claims={claims} isAuthor={false} canClaim={canClaim} />
            {canReport && (
              <div className="flex justify-end border-t border-border pt-3">
                <ReportDialog postId={post.id} />
              </div>
            )}
          </>
        )}

        <DemoDataNotice variant="footer" />
      </PageContainer>
    </>
  );
}

function DetailSkeleton() {
  return (
    <PageContainer width="content" className="flex flex-col gap-5 pb-10" aria-hidden>
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-10 w-3/4" />
      <Skeleton className="h-5 w-1/2" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-24 w-full" />
    </PageContainer>
  );
}
