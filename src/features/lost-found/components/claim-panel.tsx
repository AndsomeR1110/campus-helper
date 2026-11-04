"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  Button,
  ConfirmDialog,
  FormField,
  ListItem,
  StatusBadge,
  Textarea,
  toast,
} from "@/components/ui";

import { CLAIM_MAX_LENGTH, CLAIM_MIN_LENGTH } from "../constants";
import type { LostFoundClaim, LostFoundPost } from "../types";

interface Props {
  post: LostFoundPost;
  /** `null` means "you may not read them", which is different from "none". */
  claims: LostFoundClaim[] | null;
  isAuthor: boolean;
  canClaim: boolean;
}

/**
 * Author: decide pending claims. Everyone else: submit one private claim.
 * The decision goes through the route handler so the server, not this component,
 * enforces who may answer (LF-AC-06, LF-AC-07).
 */
export function ClaimPanel({ post, claims, isAuthor, canClaim }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [decision, setDecision] = useState<{ id: string; accept: boolean } | null>(null);

  async function submitClaim() {
    setPending("claim");
    try {
      const response = await fetch(`/api/lost-found/posts/${post.id}/claims`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const payload = (await response.json()) as {
        error?: { message: string; fields?: Record<string, string> };
      };
      if (!response.ok) {
        toast.error(payload.error?.fields?.message ?? payload.error?.message ?? "Claim failed.");
        return;
      }
      setMessage("");
      toast.success("Claim sent to the author.");
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  async function decide(claimId: string, accept: boolean) {
    setPending(claimId);
    try {
      const response = await fetch(`/api/lost-found/claims/${claimId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: accept ? "ACCEPT" : "REJECT" }),
      });
      const payload = (await response.json()) as { error?: { message: string } };
      if (!response.ok) {
        toast.error(payload.error?.message ?? "This claim could not be updated.");
        return;
      }
      toast.success(accept ? "Claim accepted." : "Claim rejected.");
      router.refresh();
    } finally {
      setPending(null);
      setDecision(null);
    }
  }

  if (isAuthor) {
    return (
      <section className="flex flex-col gap-3" aria-label="Claims">
        <h2 className="text-subtitle">Claims</h2>
        {claims && claims.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {claims.map((claim) => (
              <li key={claim.id} className="rounded-md border border-border bg-surface p-3">
                <ListItem
                  title={claim.claimantName}
                  trailing={<StatusBadge kind="claim" status={claim.status} />}
                />
                <p className="mt-2 text-body-sm text-text-muted">{claim.message}</p>
                {claim.status === "PENDING" &&
                post.status !== "RESOLVED" &&
                post.status !== "CLOSED" ? (
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      variant="primary"
                      loading={pending === claim.id}
                      onClick={() => setDecision({ id: claim.id, accept: true })}
                    >
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={pending === claim.id}
                      onClick={() => setDecision({ id: claim.id, accept: false })}
                    >
                      Reject
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-body-sm text-text-muted">No claims yet.</p>
        )}

        <ConfirmDialog
          open={decision !== null}
          title={decision?.accept ? "Accept this claim?" : "Reject this claim?"}
          description={
            decision?.accept
              ? "The other pending claims will be rejected. The post stays open until you mark it resolved."
              : "The claimant will be told no. The post stays open for other claims."
          }
          confirmLabel={decision?.accept ? "Accept claim" : "Reject claim"}
          tone={decision?.accept ? "primary" : "danger"}
          onClose={() => setDecision(null)}
          onConfirm={async () => {
            if (decision) await decide(decision.id, decision.accept);
          }}
        />
      </section>
    );
  }

  if (!canClaim) {
    return (
      <section className="flex flex-col gap-2" aria-label="Claims">
        <h2 className="text-subtitle">Is it yours?</h2>
        <p className="text-body-sm text-text-muted">This post is no longer taking claims.</p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3" aria-label="Claims">
      <h2 className="text-subtitle">Is it yours?</h2>
      <p className="text-body-sm text-text-muted">
        Only the person who posted this item can read your message.
      </p>
      <FormField
        label="Your claim"
        required
        hint={`${CLAIM_MIN_LENGTH}–${CLAIM_MAX_LENGTH} characters.`}
      >
        <Textarea
          name="message"
          rows={4}
          maxLength={CLAIM_MAX_LENGTH}
          value={message}
          placeholder="Describe a detail only the owner would know."
          onChange={(event) => setMessage(event.target.value)}
        />
      </FormField>
      <Button
        onClick={submitClaim}
        loading={pending === "claim"}
        disabled={message.trim().length < CLAIM_MIN_LENGTH}
        fullWidth
      >
        Send claim
      </Button>
    </section>
  );
}
