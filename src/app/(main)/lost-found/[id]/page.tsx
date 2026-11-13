import { Check, Clock, Lock, MapPin, Tag, UserRound, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";

import { PageContainer, TopBar } from "@/components/layout";
import {
  EmptyState,
  LocationText,
  Skeleton,
  StatusBadge,
  TypeIcon,
  TypeTag,
  buttonStyles,
  cardStyles,
  typeColorClasses,
} from "@/components/ui";
import { ReportDialog } from "@/features/admin";
import {
  CATEGORY_LABELS,
  ClaimPanel,
  PostOwnerActions,
  formatDisplayName,
  type LostFoundPost,
} from "@/features/lost-found";
import { getCurrentViewer, getLostFoundRuntime } from "@/features/lost-found/server";
import { formatDate, formatTime } from "@/lib/time";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Post" };

type Params = Promise<{ id: string }>;

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      <Skeleton className="h-64 w-full rounded-lg" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

/**
 * A hidden post answers the same way a missing one does, so a reporter cannot
 * learn whether the author really took it down.
 */
function Unavailable() {
  return (
    <EmptyState
      className="rounded-lg border border-border bg-surface"
      icon={Lock}
      title="This post is not available"
      description="It may have been removed, hidden after a report, or the link may be wrong."
      action={
        <Link href="/lost-found" className={buttonStyles({ size: "sm" })}>
          Back to Lost & Found
        </Link>
      }
    />
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
    return <Unavailable />;
  }

  const { post, claims } = detail;
  const isAuthor = viewer?.id === post.authorId;
  const occurred = new Date(post.occurredAt);

  const tag = post.kind === "LOST" ? "lost" : "found";

  return (
    <article className="flex flex-col gap-5">
      <header className={cardStyles({ variant: "widget", className: "flex flex-col gap-4" })}>
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className={cn(
              "flex size-14 shrink-0 items-center justify-center rounded-md",
              typeColorClasses(tag),
            )}
          >
            <TypeIcon type={tag} className="size-7" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <TypeTag type={tag} />
              <StatusBadge kind="post" status={post.status} />
            </div>
            <h2 className="text-title-lg break-words">{post.title}</h2>
          </div>
        </div>

        <PostProgress status={post.status} kind={post.kind} />

        <dl className="flex flex-col divide-y divide-liquid-edge rounded-md bg-surface-translucent px-4">
          <InfoRow icon={MapPin} label="Where">
            <LocationText
              location={post.location}
              fallbackIcon={false}
              wrap
              className="justify-end text-right"
            />
          </InfoRow>
          <InfoRow icon={Clock} label="When">
            <span className="tabular-nums">
              {formatDate(occurred)} · {formatTime(occurred)}
            </span>
          </InfoRow>
          <InfoRow icon={Tag} label="Category">
            {CATEGORY_LABELS[post.category]}
          </InfoRow>
          <InfoRow icon={UserRound} label="Posted by">
            {isAuthor ? "You" : formatDisplayName(post.authorName)}
          </InfoRow>
        </dl>
      </header>

      <section aria-labelledby="post-description" className="flex flex-col gap-2">
        <h3 id="post-description" className="text-caption tracking-wide text-text-muted uppercase">
          Description
        </h3>
        <div className={cardStyles({ className: "flex flex-col gap-4" })}>
          <p className="text-body whitespace-pre-line">{post.description}</p>
          {post.image?.url ? (
            // The route answers with the stored bytes; no public/ folder involved.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.image.url}
              alt={`Photo attached to ${post.title}`}
              className="w-full rounded-md border border-border object-cover shadow-card"
            />
          ) : null}
        </div>
      </section>

      <ClaimPanel
        post={post}
        claims={claims}
        isAuthor={isAuthor}
        canClaim={!isAuthor && post.status !== "RESOLVED" && post.status !== "CLOSED"}
      />

      {isAuthor ? (
        <PostOwnerActions postId={post.id} status={post.status} />
      ) : (
        <div className="flex justify-center">
          <ReportDialog postId={post.id} />
        </div>
      )}
    </article>
  );
}

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 py-3">
      <dt className="flex shrink-0 items-center gap-2 text-body-sm text-text-muted">
        <Icon className="size-4" aria-hidden />
        {label}
      </dt>
      <dd className="ml-auto min-w-0 text-right text-body-sm">{children}</dd>
    </div>
  );
}

const STEPS = ["OPEN", "CLAIM_PENDING", "RESOLVED"] as const;

/** Where the post is in its life: Posted → Claim pending → Back with owner (PRD 7.4). */
function PostProgress({
  status,
  kind,
}: {
  status: LostFoundPost["status"];
  kind: LostFoundPost["kind"];
}) {
  if (status === "CLOSED" || status === "HIDDEN") {
    return (
      <p className="flex items-center gap-2 rounded-md bg-neutral-subtle px-3 py-2 text-body-sm text-neutral">
        <Lock className="size-4 shrink-0" aria-hidden />
        {status === "CLOSED"
          ? "The author closed this post. It no longer takes claims."
          : "This post is hidden after a report."}
      </p>
    );
  }
  const current = STEPS.indexOf(status);
  const labels = ["Posted", "Claim pending", kind === "LOST" ? "Found its owner" : "Returned"];
  return (
    <ol className="flex items-center gap-1" aria-label="Progress">
      {labels.map((label, index) => {
        const done = index <= current;
        return (
          <li
            key={label}
            aria-current={index === current ? "step" : undefined}
            className="flex flex-1 flex-col gap-1.5"
          >
            <span
              aria-hidden
              className={cn(
                "h-1.5 rounded-full transition-colors",
                done ? (index === 2 ? "bg-success" : "bg-primary") : "bg-border",
              )}
            />
            <span
              className={cn(
                "flex items-center gap-1 text-caption",
                index === current ? "font-semibold text-text" : "text-text-muted",
              )}
            >
              {done && index < current ? <Check className="size-3" aria-hidden /> : null}
              {label}
            </span>
          </li>
        );
      })}
    </ol>
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
