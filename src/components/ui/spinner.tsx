import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface SpinnerProps {
  className?: string;
  /** Accessible label. Omit when the spinner sits next to visible text. */
  label?: string;
}

export function Spinner({ className, label }: SpinnerProps) {
  return (
    <LoaderCircle
      className={cn("size-5 animate-spin", className)}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "status" : undefined}
    />
  );
}
