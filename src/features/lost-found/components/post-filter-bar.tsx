"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, Chip, ChipGroup, FormField, Input, Select } from "@/components/ui";
import { CATEGORY_LABELS, POST_CATEGORIES, POST_KIND_LABELS } from "../constants";
import { hasActiveFilters, toSearchString } from "../filters";
import type { PostFilters, PostKind } from "../types";

/**
 * Keyword + type + category filters (FR-LF-03, LF-AC-04).
 * The state lives in the URL, so every change is a navigation and the list
 * stays server-rendered: /lost-found?q=key&kind=FOUND&category=KEYS
 */
export function PostFilterBar({ filters }: { filters: PostFilters }) {
  const router = useRouter();
  const [q, setQ] = useState(filters.q);

  function apply(next: PostFilters) {
    router.push(`/lost-found${toSearchString(next)}`);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    apply({ ...filters, q: q.trim() });
  }

  const kindOptions: readonly { value: PostKind | "ALL"; label: string }[] = [
    { value: "ALL", label: "All" },
    { value: "LOST", label: POST_KIND_LABELS.LOST },
    { value: "FOUND", label: POST_KIND_LABELS.FOUND },
  ];

  return (
    <div className="flex flex-col gap-3">
      <form role="search" onSubmit={submit} className="flex gap-2">
        <FormField label="Search posts" className="flex-1">
          <Input
            name="q"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Item, description or place"
            autoComplete="off"
          />
        </FormField>
        <Button type="submit" variant="secondary" className="mt-6 h-11 shrink-0">
          Search
        </Button>
      </form>

      <ChipGroup label="Post type">
        {kindOptions.map((option) => (
          <Chip
            key={option.value}
            selected={filters.kind === option.value}
            onClick={() => apply({ ...filters, kind: option.value })}
          >
            {option.label}
          </Chip>
        ))}
      </ChipGroup>

      <FormField label="Category">
        <Select
          value={filters.category}
          onChange={(event) =>
            apply({ ...filters, category: event.target.value as PostFilters["category"] })
          }
        >
          <option value="ALL">All categories</option>
          {POST_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {CATEGORY_LABELS[category]}
            </option>
          ))}
        </Select>
      </FormField>

      {hasActiveFilters(filters) && (
        <Button
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => {
            setQ("");
            router.push("/lost-found");
          }}
        >
          Clear filters
        </Button>
      )}
    </div>
  );
}
