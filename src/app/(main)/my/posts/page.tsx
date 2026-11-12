import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { PageContainer, TopBar } from "@/components/layout";
import { Megaphone } from "lucide-react";
import { EmptyState, Skeleton, buttonStyles, cardStyles } from "@/components/ui";
import { PostCard } from "@/features/lost-found";
import { getLostFoundRuntime } from "@/features/lost-found/server";

export const metadata: Metadata = { title: "My posts" };

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      {[0, 1, 2].map((key) => (
        <Skeleton key={key} className="h-36 w-full" />
      ))}
    </div>
  );
}

async function MyPostsList() {
  await connection();
  const { service } = getLostFoundRuntime();
  const posts = await service.listMyPosts();

  if (posts.length === 0) {
    return (
      <EmptyState
        className="rounded-lg border border-border bg-surface"
        icon={Megaphone}
        title="You have not posted anything yet"
        description="Items you report as lost or found show up here, together with their claims."
        action={
          <Link href="/lost-found/new" className={buttonStyles({ size: "sm" })}>
            New post
          </Link>
        }
      />
    );
  }

  const open = posts.filter((p) => p.status === "OPEN" || p.status === "CLAIM_PENDING").length;
  const claims = posts.reduce((sum, p) => sum + p.claimCount, 0);
  const stats = [
    { label: "Posts", value: posts.length },
    { label: "Still open", value: open },
    { label: "Claims received", value: claims },
  ];

  return (
    <div className="flex flex-col gap-4">
      <dl className={cardStyles({ variant: "widget", className: "grid grid-cols-3 gap-2 p-3" })}>
        {stats.map((stat) => (
          <div key={stat.label} className="flex flex-col items-center gap-0.5 py-1">
            <dd className="text-title-lg tabular-nums">{stat.value}</dd>
            <dt className="text-center text-caption text-text-muted">{stat.label}</dt>
          </div>
        ))}
      </dl>
      <ul className="grid gap-3 md:grid-cols-2">
        {posts.map((post) => (
          <li key={post.id}>
            <PostCard post={post} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** PG-17. */
export default function MyPostsPage() {
  return (
    <>
      <TopBar title="My posts" backHref="/lost-found" />
      <PageContainer width="list" className="py-4">
        <Suspense fallback={<ListSkeleton />}>
          <MyPostsList />
        </Suspense>
      </PageContainer>
    </>
  );
}
