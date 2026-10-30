import type { Metadata } from "next";
import Link from "next/link";
import { PackageSearch, Plus } from "lucide-react";
import { PageContainer, TopBar } from "@/components/layout";
import { buttonStyles, DemoDataNotice, EmptyState } from "@/components/ui";
import { PostCard } from "@/features/lost-found";
import { getViewer, listMyPosts } from "@/features/lost-found/server";

export const metadata: Metadata = {
  title: "My posts · Campus Helper",
};

/** PG-17 — My Posts (FR-LF-07): the viewer's own posts, hidden ones included. */
export default function MyPostsPage() {
  const posts = listMyPosts(getViewer());

  return (
    <>
      <TopBar
        title="My posts"
        actions={
          <Link href="/lost-found/new" className={buttonStyles({ size: "sm" })}>
            <Plus className="size-4" aria-hidden />
            New post
          </Link>
        }
      />
      <PageContainer width="list" className="flex flex-col gap-4 pb-8">
        {posts.length === 0 ? (
          <EmptyState
            icon={PackageSearch}
            title="You have not posted anything yet"
            description="Lost something or found something? Create a post so the other side can reach you."
            action={
              <Link href="/lost-found/new" className={buttonStyles({ size: "sm" })}>
                Create a post
              </Link>
            }
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {posts.map((post) => (
              <li key={post.id}>
                <PostCard post={post} />
              </li>
            ))}
          </ul>
        )}
        <DemoDataNotice variant="footer" />
      </PageContainer>
    </>
  );
}
