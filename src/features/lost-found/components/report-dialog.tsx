"use client";

import { Flag } from "lucide-react";
import { useState } from "react";
import { Button, FormField, Modal, Textarea, toast } from "@/components/ui";
import { MAX_REPORT_REASON_LENGTH } from "../constants";

/** Report a post so an administrator can review it (FR-LF-08, LF-AC-09). */
export function ReportDialog({ postId }: { postId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);

  async function submit() {
    if (!reason.trim()) {
      setError("Tell us what is wrong with this post.");
      return;
    }
    setError(undefined);
    setPending(true);
    try {
      const response = await fetch("/api/lost-found/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, reason }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setError(body?.error?.message ?? "Could not send this report.");
        return;
      }
      setOpen(false);
      setReason("");
      toast.success("Report sent to the administrators");
    } catch {
      setError("Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Flag />
        Report this post
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Report this post"
        description="An administrator will review it. The poster is not told who reported it."
        dismissible={!pending}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setOpen(false)}
              disabled={pending}
              fullWidth
              className="md:w-auto"
            >
              Cancel
            </Button>
            <Button onClick={submit} loading={pending} fullWidth className="md:w-auto">
              Send report
            </Button>
          </>
        }
      >
        <FormField
          label="What is wrong?"
          required
          error={error}
          hint={`Up to ${MAX_REPORT_REASON_LENGTH} characters.`}
        >
          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={4}
            placeholder="Spam, offensive content, or a post that is not about a lost item."
          />
        </FormField>
      </Modal>
    </>
  );
}
