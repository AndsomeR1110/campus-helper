"use client";

import { useState, type ReactNode } from "react";
import { Button } from "./button";
import { Modal } from "./modal";

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  /** Phrase as a question: "Cancel this booking?" */
  title: string;
  /** Say what is affected and what happens next. */
  description: ReactNode;
  /** Specific verb, e.g. "Cancel booking". Never "OK". */
  confirmLabel: string;
  /** e.g. "Keep booking". */
  cancelLabel?: string;
  /** "danger" for irreversible actions (default), "primary" otherwise. */
  tone?: "danger" | "primary";
  /**
   * Runs the action. While the promise is pending the dialog shows a spinner
   * and cannot be dismissed. Close the dialog yourself on success; on failure
   * throw (and show a toast) to keep it open.
   */
  onConfirm: () => void | Promise<void>;
}

/** Confirmation for cancel / delete actions (ui-ux-spec §4.6). */
export function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel,
  cancelLabel = "Go back",
  tone = "danger",
  onConfirm,
}: ConfirmDialogProps) {
  const [pending, setPending] = useState(false);

  async function handleConfirm() {
    setPending(true);
    try {
      await onConfirm();
    } catch {
      // The caller reports the error (e.g. with a toast); keep the dialog open.
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      dismissible={!pending}
      role="alertdialog"
      footer={
        <>
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={pending}
            fullWidth
            className="md:w-auto"
          >
            {cancelLabel}
          </Button>
          <Button
            variant={tone}
            onClick={handleConfirm}
            loading={pending}
            fullWidth
            className="md:w-auto"
          >
            {confirmLabel}
          </Button>
        </>
      }
    />
  );
}
