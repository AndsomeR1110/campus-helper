import { getTranslations } from "@/lib/i18n/server";
import type { Metadata } from "next";

import { PageContainer, TopBar } from "@/components/layout";
import { PostForm } from "@/features/lost-found";

export const metadata: Metadata = { title: "New post" };

/** PG-15. */
export default async function NewPostPage() {
  const t = await getTranslations();
  return (
    <>
      <TopBar title={t("New post")} backHref="/lost-found" />
      <PageContainer width="content" className="flex flex-col gap-4 py-4">
        <p className="text-body-sm text-text-muted">
          {t(
            "Describe the item so its owner can recognise it. Do not include ID numbers, full student numbers or phone numbers — this description is public.",
          )}
        </p>
        <PostForm />
      </PageContainer>
    </>
  );
}
