"use client";

import { Sparkles } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { Button, Card, EmptyState, ErrorState, Skeleton, useOffline } from "@/components/ui";

import { requestLostFoundMatches } from "../server/match-action";

export function PossibleMatches({ postId }: { postId: string }) {
  const offline = useOffline();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<Awaited<ReturnType<typeof requestLostFoundMatches>>>();

  function search() {
    startTransition(async () => {
      try {
        setResult(await requestLostFoundMatches(postId));
      } catch {
        setResult({ error: "Could not find matches right now. Please try again." });
      }
    });
  }

  return (
    <section aria-labelledby="possible-matches" className="flex flex-col gap-2">
      <h3 id="possible-matches" className="text-caption tracking-wide text-text-muted uppercase">
        Possible matches
      </h3>
      <Card className="flex flex-col gap-3">
        <p className="text-body-sm text-text-muted">
          AI compares the public text of your post with found-item posts. Check each clue before
          requesting a claim.
        </p>
        {offline && <p className="text-caption text-text-muted">Unavailable offline</p>}
        {(!result || pending) && (
          <Button
            size="sm"
            variant="secondary"
            className="self-start"
            disabled={offline}
            loading={pending}
            onClick={search}
          >
            <Sparkles aria-hidden />
            {pending ? "Finding matches…" : "Find matches with AI"}
          </Button>
        )}
        <div aria-live="polite" aria-busy={pending}>
          {pending && <Skeleton className="h-16 w-full" />}
          {!pending && result && "error" in result && (
            <ErrorState
              className="py-4"
              title="Matching unavailable"
              description={result.error}
              onRetry={offline ? undefined : search}
            />
          )}
          {!pending && result && "matches" in result && (
            <>
              {result.matches.length === 0 ? (
                <EmptyState
                  className="py-4"
                  title="No clear matches yet"
                  description="You can keep browsing Lost & Found or check again after new posts appear."
                />
              ) : (
                <ol className="divide-y divide-border">
                  {result.matches.map((match) => (
                    <li key={match.postId} className="flex flex-col gap-1 py-3">
                      <Link
                        href={`/lost-found/${encodeURIComponent(match.postId)}`}
                        className="text-subtitle break-words text-primary underline"
                      >
                        {match.title}
                      </Link>
                      <p className="text-body-sm break-words text-text-muted">{match.reason}</p>
                    </li>
                  ))}
                </ol>
              )}
              <Button variant="ghost" size="sm" disabled={offline} onClick={search}>
                Check again
              </Button>
            </>
          )}
        </div>
      </Card>
    </section>
  );
}
