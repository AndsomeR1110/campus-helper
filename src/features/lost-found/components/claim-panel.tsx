"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, ConfirmDialog, FormField, StatusBadge, Textarea, toast } from "@/components/ui";
import { formatDate, formatTime } from "@/lib/time";
import { formatDisplayName, MIN_CLAIM_MESSAGE_LENGTH } from "../constants";
import type { LostFoundClaim, LostFoundPost } from "../types";

interface ClaimPanelProps {
  post: LostFoundPost;
  /** Null when the viewer may not read private claim text (LF-AC-06). */
  claims: readonly LostFoundClaim[] | null;
  isAuthor: boolean;
  canClaim: boolean;
}

async function postJson(url: string, payload: unknown): Promise<{ ok: boolean; message?: string }> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (response.ok) return { ok: true };
    const body = await response.json().catch(() => null);
    return { ok: false, message: body?.error?.message ?? "Something went wrong." };
  } catch {
    return { ok: false, message: "Check your connection and try again." };
  }
}

/**
 * Claims block on the detail page (FR-LF-05/06).
 * The author sees the private descriptions and decides; everyone else sees a
 * form to submit one while the post still accepts claims.
 */
export function ClaimPanel({ post, claims, isAuthor, canClaim }: ClaimPanelProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);
  const [deciding, setDeciding] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function submitClaim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (message.trim().length < MIN_CLAIM_MESSAGE_LENGTH) {
      setError(
        `Explain how you can prove it is yours (at least ${MIN_CLAIM_MESSAGE_LENGTH} characters).`,
      );
      return;
    }
    setError(undefined);
    setPending(true);
    const result = await postJson("/api/lost-found/claims", { postId: post.id, message });
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setMessage("");
    toast.success("Claim sent to the poster");
    router.refresh();
  }

  async function decide(claimId: string, decision: "ACCEPT" | "REJECT") {
    setDeciding(claimId);
    const result = await postJson(`/api/lost-found/claims/${claimId}/decision`, { decision });
    setDeciding(null);
    setConfirmId(null);
    if (!result.ok) {
      toast.error(result.message ?? "Could not update this claim.");
      return;
    }
    toast.success(decision === "ACCEPT" ? "Claim accepted" : "Claim rejected");
    router.refresh();
  }

  if (isAuthor) {
    return (
      <section aria-labelledby="claims-heading" className="flex flex-col gap-3">
        <h2 id="claims-heading" className="text-subtitle text-text">
          Claims
        </h2>
        {claims && claims.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {claims.map((claim) => (
              <li key={claim.id} className="rounded-md border border-border bg-surface p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-subtitle text-text">
                    {formatDisplayName(claim.claimantName)}
                  </span>
                  <StatusBadge kind="claim" status={claim.status} />
                </div>
                <p className="mt-1 text-caption text-text-muted">
                  {formatDate(claim.createdAt)} · {formatTime(claim.createdAt)}
                </p>
                <p className="mt-2 text-body-sm text-text">{claim.message}</p>
                {claim.status === "PENDING" && (
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" onClick={() => setConfirmId(claim.id)}>
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={deciding === claim.id}
                      onClick={() => void decide(claim.id, "REJECT")}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-body-sm text-text-muted">No claims yet.</p>
        )}

        <ConfirmDialog
          open={confirmId !== null}
          onClose={() => setConfirmId(null)}
          title="Accept this claim?"
          description="The other pending claims will be rejected and the post will be marked Resolved."
          confirmLabel="Accept claim"
          tone="primary"
          onConfirm={async () => {
            if (confirmId) await decide(confirmId, "ACCEPT");
          }}
        />
      </section>
    );
  }

  if (!canClaim) {
    return (
      <p className="rounded-md bg-surface-muted px-4 py-3 text-body-sm text-text-muted">
        This post is no longer accepting claims.
      </p>
    );
  }

  return (
    <section aria-labelledby="claim-form-heading" className="flex flex-col gap-3">
      <h2 id="claim-form-heading" className="text-subtitle text-text">
        Is it yours?
      </h2>
      <p className="text-body-sm text-text-muted">
        Only the person who posted this item can read your message.
      </p>
      <form onSubmit={submitClaim} className="flex flex-col gap-3">
        <FormField
          label="Your claim"
          required
          error={error}
          hint="Describe a detail only the owner would know."
        >
          <Textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={4}
            placeholder="The case has a scratch on the back and I can show the serial number."
          />
        </FormField>
        <Button type="submit" fullWidth loading={pending}>
          Send claim
        </Button>
      </form>
    </section>
  );
}
