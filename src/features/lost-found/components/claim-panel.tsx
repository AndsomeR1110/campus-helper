"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Check, HandHeart, Lock, MessageSquare, Send, X } from "lucide-react";
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  FormField,
  StatusBadge,
  Textarea,
  cardStyles,
  toast,
} from "@/components/ui";
import { formatRelativeDay, formatTime } from "@/lib/time";
import { cn } from "@/lib/utils";

import { CLAIM_MAX_LENGTH, CLAIM_MIN_LENGTH, formatDisplayName } from "../constants";
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
  // Relative day labels for claims; the panel is a client component rendered per request.
  const [now] = useState(() => new Date());

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
    const pendingCount = claims?.filter((c) => c.status === "PENDING").length ?? 0;
    return (
      <section className="flex flex-col gap-3" aria-labelledby="claims-heading">
        <div className="flex items-center gap-2">
          <h2 id="claims-heading" className="text-caption tracking-wide text-text-muted uppercase">
            Claims
          </h2>
          {pendingCount > 0 && (
            <span className="rounded-full bg-warning-subtle px-2 py-0.5 text-caption text-warning">
              {pendingCount} waiting
            </span>
          )}
        </div>
        <p className="flex items-center gap-1.5 text-caption text-text-muted">
          <Lock className="size-3.5" aria-hidden />
          Only you can read these messages.
        </p>
        {claims && claims.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {claims.map((claim) => {
              const open =
                claim.status === "PENDING" &&
                post.status !== "RESOLVED" &&
                post.status !== "CLOSED";
              return (
                <li
                  key={claim.id}
                  className={cardStyles({
                    variant: open ? "widget" : "default",
                    className: "flex flex-col gap-3",
                  })}
                >
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden
                      className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-subtitle text-primary"
                    >
                      {initial(claim.claimantName)}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-subtitle">
                        {formatDisplayName(claim.claimantName)}
                      </span>
                      <span className="text-caption text-text-muted">
                        {formatRelativeDay(claim.createdAt, now)} · {formatTime(claim.createdAt)}
                      </span>
                    </div>
                    <StatusBadge kind="claim" status={claim.status} />
                  </div>
                  <blockquote className="rounded-sm border-l-4 border-primary/40 bg-surface-muted/70 px-3 py-2 text-body-sm whitespace-pre-line text-text">
                    {claim.message}
                  </blockquote>
                  {open ? (
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        loading={pending === claim.id}
                        onClick={() => setDecision({ id: claim.id, accept: false })}
                      >
                        <X />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        loading={pending === claim.id}
                        onClick={() => setDecision({ id: claim.id, accept: true })}
                      >
                        <Check />
                        Accept
                      </Button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <Card className="p-0">
            <EmptyState
              icon={MessageSquare}
              title="No claims yet"
              description="When someone thinks this is theirs, their message appears here."
              className="py-6"
            />
          </Card>
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
      <section
        className={cardStyles({ className: "flex items-center gap-3" })}
        aria-labelledby="claim-heading"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-neutral-subtle text-neutral">
          <Lock className="size-5" aria-hidden />
        </span>
        <div className="flex flex-col">
          <h2 id="claim-heading" className="text-subtitle">
            Is it yours?
          </h2>
          <p className="text-body-sm text-text-muted">This post is no longer taking claims.</p>
        </div>
      </section>
    );
  }

  const length = message.trim().length;
  return (
    <section
      className={cardStyles({ variant: "widget", className: "flex flex-col gap-4" })}
      aria-labelledby="claim-heading"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-primary">
          <HandHeart className="size-5" aria-hidden />
        </span>
        <div className="flex flex-col gap-0.5">
          <h2 id="claim-heading" className="text-subtitle">
            Is it yours?
          </h2>
          <p className="flex items-center gap-1.5 text-body-sm text-text-muted">
            <Lock className="size-3.5 shrink-0" aria-hidden />
            Only the person who posted this item can read your message.
          </p>
        </div>
      </div>
      <FormField
        label="Your claim"
        required
        hint={`Mention a detail only the owner would know, like a mark, a sticker or what is inside. ${CLAIM_MIN_LENGTH}–${CLAIM_MAX_LENGTH} characters.`}
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
      <div className="flex items-center justify-between gap-3">
        <span
          className={cn(
            "text-caption tabular-nums",
            length < CLAIM_MIN_LENGTH ? "text-text-muted" : "text-success",
          )}
          aria-live="polite"
        >
          {length < CLAIM_MIN_LENGTH
            ? `${CLAIM_MIN_LENGTH - length} more characters needed`
            : `${length} / ${CLAIM_MAX_LENGTH}`}
        </span>
        <Button
          onClick={submitClaim}
          loading={pending === "claim"}
          disabled={length < CLAIM_MIN_LENGTH}
        >
          <Send />
          Send claim
        </Button>
      </div>
    </section>
  );
}

function initial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}
