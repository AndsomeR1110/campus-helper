"use client";

import { CircleAlert } from "lucide-react";
import { createContext, useContext, useId, type AriaAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FormFieldContextValue {
  id: string;
  describedBy: string | undefined;
  invalid: boolean;
  required: boolean;
}

const FormFieldContext = createContext<FormFieldContextValue | null>(null);

/** Wires an Input / Textarea / Select to its FormField label, hint and error. */
export function useFormField() {
  return useContext(FormFieldContext);
}

export interface FormFieldProps {
  label: string;
  hint?: string;
  /** Error message. When set the control is marked `aria-invalid`. */
  error?: string;
  required?: boolean;
  /** Override the generated id, e.g. to match an existing `htmlFor`. */
  id?: string;
  className?: string;
  children: ReactNode;
}

/**
 * Label + control + hint/error, following ui-ux-spec §4.3.
 * Place exactly one Input, Textarea or Select inside.
 */
export function FormField({
  label,
  hint,
  error,
  required = false,
  id,
  className,
  children,
}: FormFieldProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <FormFieldContext.Provider value={{ id: controlId, describedBy, invalid: !!error, required }}>
      <div className={cn("flex flex-col gap-1.5", className)}>
        <label htmlFor={controlId} className="text-body-sm font-medium text-text">
          {label}
          {required && (
            <span className="text-danger" aria-hidden>
              {" "}
              *
            </span>
          )}
        </label>
        {children}
        {error && (
          <p id={errorId} className="flex items-start gap-1.5 text-body-sm text-danger">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            {error}
          </p>
        )}
        {hint && (
          <p id={hintId} className="text-body-sm text-text-muted">
            {hint}
          </p>
        )}
      </div>
    </FormFieldContext.Provider>
  );
}

/** Shared control classes for Input, Textarea and Select. Text is 16px to stop iOS zooming. */
export const controlClasses = cn(
  "w-full rounded-sm border border-border-strong bg-surface px-3 text-body text-text transition-colors duration-150",
  "placeholder:text-text-disabled hover:border-text-disabled",
  "focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-focus-ring",
  "disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-text-muted",
  "aria-invalid:border-danger aria-invalid:focus-visible:outline-danger",
);

/** Props a control should spread to connect itself to the surrounding FormField. */
export function useFieldControlProps(
  props: Pick<AriaAttributes, "aria-describedby" | "aria-invalid"> & {
    id?: string;
    required?: boolean;
  },
) {
  const field = useFormField();
  return {
    id: props.id ?? field?.id,
    required: props.required ?? field?.required,
    "aria-describedby": props["aria-describedby"] ?? field?.describedBy,
    "aria-invalid": props["aria-invalid"] ?? (field?.invalid || undefined),
  };
}
