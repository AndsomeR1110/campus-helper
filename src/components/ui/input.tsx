"use client";

import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { controlClasses, useFieldControlProps } from "./form-field";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

/**
 * Text-like input (text, email, password, search, date, time…).
 * For 30-minute time slots use `type="time" step={1800}`.
 */
export function Input({ className, type = "text", ...props }: InputProps) {
  const fieldProps = useFieldControlProps(props);
  return (
    <input
      type={type}
      {...props}
      {...fieldProps}
      className={cn(controlClasses, "h-11", className)}
    />
  );
}
