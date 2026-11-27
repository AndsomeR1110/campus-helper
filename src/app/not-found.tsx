import { getTranslations } from "@/lib/i18n/server";
import Link from "next/link";
import { CampusIllustration, ErrorState, buttonStyles } from "@/components/ui";

export default async function NotFound() {
  const t = await getTranslations();
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-10">
      <CampusIllustration className="w-full max-w-sm [mask-image:radial-gradient(closest-side,black_60%,transparent)] opacity-90" />
      <ErrorState
        kind="not-found"
        title={t("Page not found")}
        description={t("This corner of campus doesn’t exist, or the page has moved.")}
        action={
          <Link href="/home" className={buttonStyles()}>
            {t("Go to Home")}
          </Link>
        }
      />
    </main>
  );
}
