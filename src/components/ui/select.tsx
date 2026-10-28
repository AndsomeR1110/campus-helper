"use client";

import { ChevronDown } from "lucide-react";
import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { controlClasses, useFieldControlProps } from "./form-field";

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

/** Native select (best mobile experience); pass `<option>` children. */
export function Select({ className, children, ...props }: SelectProps) {
  const fieldProps = useFieldControlProps(props);
  return (
    <div className="relative">
      <select
        {...props}
        {...fieldProps}
        className={cn(controlClasses, "h-11 appearance-none pr-10", className)}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-text-muted"
        aria-hidden
      />
    </div>
  );
}
