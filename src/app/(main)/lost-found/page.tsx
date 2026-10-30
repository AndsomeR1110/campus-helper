import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PackageSearch, Plus } from "lucide-react";
import { PageContainer, TopBar } from "@/components/layout";
import { buttonStyles, DemoDataNotice, EmptyState, Skeleton } from "@/components/ui";
import { hasActiveFilters, parsePostFilters, PostCard, PostFilterBar } from "@/features/lost-found";
import { getViewer, listPosts } from "@/features/lost-found/server";

export const metadata: Metadata = {
  title: "Lost & Found · Campus Helper",
  description: "Report a lost item, hand in something you found, and claim what is yours.",
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** PG-14 — Lost & Found list (FR-LF-01/03/04). */
export default function LostFoundPage({ searchParams }: PageProps) {
  return (
    <>
      <TopBar
        title="Lost & Found"
        actions={
          <Link href="/lost-found/new" className={buttonStyles({ size: "sm" })}>
            <Plus className="size-4" aria-hidden />
            New post
          </Link>
        }
      />
      <PageContainer width="list" className="flex flex-col gap-4 pb-8">
        {/* searchParams are request data, so the list streams in behind a skeleton. */}
        <Suspense fallback={<ListSkeleton />}>
          <PostList searchParams={searchParams} />
        </Suspense>
        <DemoDataNotice variant="footer" />
      </PageContainer>
    </>
  );
}

async function PostList({ searchParams }: PageProps) {
  const params = await searchParams;
  const filters = parsePostFilters(params);
  const viewer = getViewer();
  const posts = listPosts(filters, viewer);
  const filtered = hasActiveFilters(filters);

  return (
    <>
      <PostFilterBar filters={filters} />

      {posts.length === 0 ? (
        filtered ? (
          <EmptyState
            icon={PackageSearch}
            title="No posts match these filters"
            description="Try a different keyword or clear the filters to see everything."
            action={
              <Link
                href="/lost-found"
                className={buttonStyles({ variant: "secondary", size: "sm" })}
              >
                Clear filters
              </Link>
            }
          />
        ) : (
          <EmptyState
            icon={PackageSearch}
            title="Nothing here yet"
            description="The first lost or found report will appear here."
            action={
              <Link href="/lost-found/new" className={buttonStyles({ size: "sm" })}>
                Create a post
              </Link>
            }
          />
        )
      ) : (
        <ul className="flex flex-col gap-3">
          {posts.map((post) => (
            <li key={post.id}>
              <PostCard post={post} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-28 w-full" />
    </div>
  );
}
