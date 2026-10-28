"use client";

import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { controlClasses, useFieldControlProps } from "./form-field";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className, rows = 4, ...props }: TextareaProps) {
  const fieldProps = useFieldControlProps(props);
  return (
    <textarea
      rows={rows}
      {...props}
      {...fieldProps}
      className={cn(controlClasses, "min-h-24 resize-y py-2.5", className)}
    />
  );
}
