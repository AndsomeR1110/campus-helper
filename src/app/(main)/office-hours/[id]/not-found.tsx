import { getTranslations } from "@/lib/i18n/server";
import Link from "next/link";

import { Button, ErrorState } from "@/components/ui";

/** 404 for unknown teacher ids (PG-05). */
export default async function TeacherNotFound() {
  const t = await getTranslations();
  return (
    <main className="mx-auto flex w-full max-w-list flex-col px-5 py-8">
      <ErrorState
        kind="not-found"
        title={t("Teacher not found")}
        description={t("This teacher may have been removed or the link is incorrect.")}
        action={
          <Link href="/office-hours">
            <Button variant="secondary">{t("Back to Office Hours")}</Button>
          </Link>
        }
      />
    </main>
  );
}
