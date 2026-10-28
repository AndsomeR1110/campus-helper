"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { IconButton } from "./icon-button";

export interface ModalProps {
  open: boolean;
  /** Called when the user asks to close (Esc, backdrop, close button). */
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  /** Action buttons, rendered right-aligned (stacked full-width on phones). */
  footer?: ReactNode;
  /** Set to false while an action is in progress to block Esc / backdrop closing. */
  dismissible?: boolean;
  /** Role for screen readers; ConfirmDialog uses "alertdialog". */
  role?: "dialog" | "alertdialog";
  className?: string;
}

/**
 * Bottom sheet on phones, centred dialog from 768px (ui-ux-spec §4.6).
 * Built on the native <dialog> element, which provides focus trapping,
 * inert background and focus restoration.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  dismissible = true,
  role = "dialog",
  className,
}: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      document.body.style.overflow = "hidden";
    } else if (!open && dialog.open) {
      dialog.close();
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      role={role}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        // Esc key
        event.preventDefault();
        if (dismissible) onClose();
      }}
      onClick={(event) => {
        // A click on the dialog element itself (not its content) is a backdrop click.
        if (event.target === event.currentTarget && dismissible) onClose();
      }}
      className={cn(
        "bg-transparent p-0 text-text backdrop:bg-overlay",
        // Phone: bottom sheet
        "mx-0 mt-auto mb-0 w-full max-w-none",
        // Tablet and up: centred dialog
        "md:m-auto md:w-[calc(100%-48px)] md:max-w-[480px]",
      )}
    >
      <div
        className={cn(
          "flex max-h-[85dvh] flex-col rounded-t-lg bg-surface shadow-overlay md:rounded-lg",
          "pb-[env(safe-area-inset-bottom)] md:pb-0",
          className,
        )}
      >
        <div className="flex items-start gap-2 px-4 pt-4 md:px-6 md:pt-6">
          <div className="flex flex-1 flex-col gap-1 pt-2">
            <h2 id={titleId} className="text-title">
              {title}
            </h2>
            {description && (
              <div id={descriptionId} className="text-body-sm text-text-muted">
                {description}
              </div>
            )}
          </div>
          {dismissible && (
            <IconButton aria-label="Close" onClick={onClose} className="-mr-2">
              <X />
            </IconButton>
          )}
        </div>
        {children && <div className="overflow-y-auto px-4 pt-4 md:px-6">{children}</div>}
        {footer && (
          <div className="flex flex-col-reverse gap-2 px-4 pt-6 pb-4 md:flex-row md:justify-end md:px-6 md:pb-6">
            {footer}
          </div>
        )}
      </div>
    </dialog>
  );
}
