"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { Button, Chip, FormField, Input, Select } from "@/components/ui";

import { CATEGORY_LABELS, POST_CATEGORIES, POST_KIND_LABELS } from "../constants";
import { toSearchString } from "../filters";
import type { PostCategory, PostFilters, PostKind } from "../types";

const KINDS: Array<{ value: PostKind | ""; label: string }> = [
  { value: "", label: "All" },
  { value: "LOST", label: POST_KIND_LABELS.LOST },
  { value: "FOUND", label: POST_KIND_LABELS.FOUND },
];

/** Filters live in the URL so a filtered list can be shared and reloaded (FR-LF-03). */
export function PostFilterBar({ filters }: { filters: PostFilters }) {
  const router = useRouter();
  const [query, setQuery] = useState(filters.query ?? "");
  const [kind, setKind] = useState<PostKind | "">(filters.kind ?? "");
  const [category, setCategory] = useState<PostCategory | "">(filters.category ?? "");

  function go(next: { query?: string; kind?: PostKind | ""; category?: PostCategory | "" }) {
    const merged: PostFilters = {
      query: next.query ?? query,
      kind: (next.kind ?? kind) || undefined,
      category: (next.category ?? category) || undefined,
    };
    router.push(`/lost-found${toSearchString(merged)}`);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    go({ query });
  }

  return (
    <section className="flex flex-col gap-3" aria-label="Filter posts">
      <form onSubmit={onSubmit} className="flex items-end gap-2">
        <FormField label="Search posts" className="flex-1" hint={undefined}>
          <Input
            name="q"
            type="search"
            value={query}
            placeholder="Item, description or place"
            onChange={(event) => setQuery(event.target.value)}
          />
        </FormField>
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      <div className="flex flex-wrap gap-2">
        {KINDS.map((option) => (
          <Chip
            key={option.label}
            selected={kind === option.value}
            onClick={() => {
              setKind(option.value);
              go({ kind: option.value });
            }}
          >
            {option.label}
          </Chip>
        ))}
      </div>

      <FormField label="Category">
        <Select
          value={category}
          onChange={(event) => {
            const value = event.target.value as PostCategory | "";
            setCategory(value);
            go({ category: value });
          }}
        >
          <option value="">All categories</option>
          {POST_CATEGORIES.map((value) => (
            <option key={value} value={value}>
              {CATEGORY_LABELS[value]}
            </option>
          ))}
        </Select>
      </FormField>
    </section>
  );
}
