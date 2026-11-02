import Link from "next/link";
import type { ReactNode } from "react";

/** Titled block on Home with an optional "See all" link. */
export function HomeSection({
  title,
  seeAllHref,
  children,
}: {
  title: string;
  seeAllHref?: string;
  children: ReactNode;
}) {
  const id = `home-${title.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 id={id} className="text-caption tracking-wide text-text-muted uppercase">
          {title}
        </h2>
        {seeAllHref && (
          <Link href={seeAllHref} className="text-body-sm font-medium text-primary hover:underline">
            See all<span className="sr-only"> {title.toLowerCase()}</span>
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
