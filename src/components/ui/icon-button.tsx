import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required: icon-only buttons have no visible text. */
  "aria-label": string;
  children: ReactNode;
}

/** Icon-only button with a 44 × 44px touch target. */
export function IconButton({ className, type = "button", children, ...props }: IconButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-full text-text transition-colors duration-150 hover:bg-surface-muted disabled:pointer-events-none disabled:opacity-50",
        "[&_svg]:size-6",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
