import Link from "next/link";
import { CampusIllustration, ErrorState, buttonStyles } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-10">
      <CampusIllustration className="w-full max-w-sm [mask-image:radial-gradient(closest-side,black_60%,transparent)] opacity-90" />
      <ErrorState
        kind="not-found"
        title="Page not found"
        description="This corner of campus doesn’t exist, or the page has moved."
        action={
          <Link href="/home" className={buttonStyles()}>
            Go to Home
          </Link>
        }
      />
    </main>
  );
}
