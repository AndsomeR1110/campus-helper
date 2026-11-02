import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface PageContainerProps {
  /** "content" (640px) for details and forms, "list" (960px) for lists and dashboards. */
  width?: "content" | "list";
  className?: string;
  children: ReactNode;
}

/** Centred page body with the standard gutters (16px phone, 24px tablet+). */
export function PageContainer({ width = "list", className, children }: PageContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full flex-col gap-6 px-4 py-4 md:px-6 md:py-6",
        width === "content" ? "max-w-content" : "max-w-list",
        className,
      )}
    >
      {children}
    </div>
  );
}
