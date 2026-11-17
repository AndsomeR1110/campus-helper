import { getTranslations } from "@/lib/i18n/server";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { PageContainer, TopBar } from "@/components/layout";
import { DemoDataNotice, EmptyState, Skeleton, buttonStyles } from "@/components/ui";
import {
  PostCard,
  PostFilterBar,
  describeFilters,
  hasActiveFilters,
  parsePostFilters,
} from "@/features/lost-found";
import { getLostFoundRuntime } from "@/features/lost-found/server";

export const metadata: Metadata = { title: "Lost & Found" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-11 w-2/3" />
      {[0, 1, 2].map((key) => (
        <Skeleton key={key} className="h-36 w-full" />
      ))}
    </div>
  );
}

async function PostList({ searchParams }: { searchParams: SearchParams }) {
  const t = await getTranslations();
  await connection();
  const filters = parsePostFilters(await searchParams);
  const { service, demo } = getLostFoundRuntime();
  const posts = await service.listPosts(filters);

  return (
    <div className="flex flex-col gap-4">
      {demo ? <DemoDataNotice variant="banner" /> : null}
      <PostFilterBar filters={filters} />

      {posts.length === 0 ? (
        <EmptyState
          icon={undefined}
          title={
            hasActiveFilters(filters) ? t("No posts match these filters") : t("Nothing here yet")
          }
          description={
            hasActiveFilters(filters)
              ? t("Nothing matches {filters}. Try a broader search.", {
                  filters: describeFilters(filters),
                })
              : t("Lost something on campus? Post it and let people help you find it.")
          }
          action={
            hasActiveFilters(filters) ? (
              <Link
                href="/lost-found"
                className={buttonStyles({ variant: "secondary", size: "sm" })}
              >
                {t("Clear filters")}
              </Link>
            ) : (
              <Link href="/lost-found/new" className={buttonStyles({ size: "sm" })}>
                {t("New post")}
              </Link>
            )
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
    </div>
  );
}

/** PG-14. The filter bar and the list read from the URL, so the page is shareable. */
export default async function LostFoundPage({ searchParams }: { searchParams: SearchParams }) {
  const t = await getTranslations();
  return (
    <>
      <TopBar
        title={t("Lost & Found")}
        actions={
          <Link href="/lost-found/new" className={buttonStyles({ size: "sm" })}>
            {t("New post")}
          </Link>
        }
      />
      <PageContainer width="list" className="flex flex-col gap-4 py-4">
        <Suspense fallback={<ListSkeleton />}>
          <PostList searchParams={searchParams} />
        </Suspense>
      </PageContainer>
    </>
  );
}
