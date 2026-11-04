import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { PageContainer, TopBar } from "@/components/layout";
import { EmptyState, Skeleton, buttonStyles } from "@/components/ui";
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

  return (
    <ul className="flex flex-col gap-3">
      {posts.map((post) => (
        <li key={post.id}>
          <PostCard post={post} />
        </li>
      ))}
    </ul>
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
