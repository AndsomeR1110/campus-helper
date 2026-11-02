import Link from "next/link";
import { ErrorState, buttonStyles } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center">
      <ErrorState
        kind="not-found"
        title="Page not found"
        description="The page you’re looking for doesn’t exist or has been moved."
        action={
          <Link href="/home" className={buttonStyles({ variant: "secondary" })}>
            Go to Home
          </Link>
        }
      />
    </main>
  );
}
