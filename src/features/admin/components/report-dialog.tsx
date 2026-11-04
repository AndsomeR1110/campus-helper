"use client";

import { Flag } from "lucide-react";
import { useState } from "react";

import { Button, FormField, Modal, Textarea, toast } from "@/components/ui";
import { REPORT_MAX_LENGTH } from "@/features/lost-found";

export interface ReportDialogProps {
  postId: string;
}

/** Any signed-in student can report a post from the detail page (FR-LF-08). */
export function ReportDialog({ postId }: ReportDialogProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/lost-found/posts/${postId}/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        setError(body?.error?.message ?? "The report could not be sent. Try again.");
        return;
      }
      toast.success("Report sent. An administrator will look at it.");
      setOpen(false);
      setReason("");
    } catch {
      setError("The report could not be sent. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Flag className="size-4" aria-hidden />
        Report this post
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Report this post"
        description="Tell an administrator what is wrong. The author will not see this."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              loading={pending}
              disabled={reason.trim().length < 10}
              onClick={() => void submit()}
            >
              Send report
            </Button>
          </div>
        }
      >
        <FormField
          label="What is wrong?"
          hint={`Up to ${REPORT_MAX_LENGTH} characters. At least 10.`}
          error={error ?? undefined}
          required
        >
          <Textarea
            rows={4}
            value={reason}
            maxLength={REPORT_MAX_LENGTH}
            placeholder="This looks like a duplicate of another post."
            onChange={(event) => setReason(event.target.value)}
          />
        </FormField>
      </Modal>
    </>
  );
}
