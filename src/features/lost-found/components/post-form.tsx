"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { Button, FormField, Input, Select, Textarea, toast } from "@/components/ui";

import {
  CATEGORY_LABELS,
  DESCRIPTION_MAX_LENGTH,
  POST_CATEGORIES,
  POST_KIND_LABELS,
  TITLE_MAX_LENGTH,
} from "../constants";
import type { PostCategory, PostKind } from "../types";

interface FieldErrors {
  [field: string]: string;
}

function isoFromLocal(value: string): string {
  // `datetime-local` has no zone; the browser is the only thing that knows it.
  return new Date(value).toISOString();
}

/** PG-15. Creates the post, then uploads the optional photo to the new id. */
export function PostForm() {
  const router = useRouter();
  const [kind, setKind] = useState<PostKind>("LOST");
  const [category, setCategory] = useState<PostCategory>("ELECTRONICS");
  const [occurredAt, setOccurredAt] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setErrors({});

    try {
      const response = await fetch("/api/lost-found/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          category,
          title: String(form.get("title") ?? ""),
          description: String(form.get("description") ?? ""),
          location: String(form.get("location") ?? ""),
          occurredAt: occurredAt ? isoFromLocal(occurredAt) : "",
          image: null,
        }),
      });
      const payload = (await response.json()) as {
        data?: { id: string };
        error?: { message: string; fields?: FieldErrors };
      };

      if (!response.ok || !payload.data) {
        setErrors(payload.error?.fields ?? {});
        toast.error(payload.error?.message ?? "The post could not be published.");
        return;
      }

      if (photo) {
        const body = new FormData();
        body.set("photo", photo);
        const upload = await fetch(`/api/lost-found/posts/${payload.data.id}/image`, {
          method: "POST",
          body,
        });
        if (!upload.ok) toast.error("Published, but the photo was not accepted.");
      }

      toast.success("Post published.");
      router.push(`/lost-found/${payload.data.id}`);
      router.refresh();
    } catch {
      toast.error("Network error. Try again when you are back online.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <FormField label="Type" required error={errors.kind}>
        <Select value={kind} onChange={(event) => setKind(event.target.value as PostKind)}>
          {(Object.keys(POST_KIND_LABELS) as PostKind[]).map((value) => (
            <option key={value} value={value}>
              {POST_KIND_LABELS[value]}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField
        label="Title"
        required
        hint={`Up to ${TITLE_MAX_LENGTH} characters.`}
        error={errors.title}
      >
        <Input name="title" maxLength={TITLE_MAX_LENGTH} placeholder="Blue water bottle" />
      </FormField>

      <FormField label="Category" required error={errors.category}>
        <Select
          value={category}
          onChange={(event) => setCategory(event.target.value as PostCategory)}
        >
          {POST_CATEGORIES.map((value) => (
            <option key={value} value={value}>
              {CATEGORY_LABELS[value]}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField
        label="Location"
        required
        error={errors.location}
        hint="Building, floor or a nearby landmark."
      >
        <Input name="location" placeholder="Library, 3rd floor" />
      </FormField>

      <FormField
        label="When did it happen?"
        required
        error={errors.occurredAt}
        hint="You cannot pick a time in the future."
      >
        <Input
          name="occurredAt"
          type="datetime-local"
          value={occurredAt}
          onChange={(event) => setOccurredAt(event.target.value)}
        />
      </FormField>

      <FormField
        label="Description"
        required
        error={errors.description}
        hint="Do not include phone numbers, ID numbers or other private details."
      >
        <Textarea
          name="description"
          rows={5}
          maxLength={DESCRIPTION_MAX_LENGTH}
          placeholder="Colour, brand, marks, or where you last saw it."
        />
      </FormField>

      <FormField
        label="Photo (optional)"
        hint="PNG, JPEG or WebP, up to 5 MB."
        error={errors.image}
      >
        <Input
          name="photo"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="h-auto cursor-pointer border-dashed py-2 text-body-sm text-text-muted file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-primary-subtle file:px-4 file:py-2 file:text-body-sm file:font-medium file:text-primary"
          onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
        />
      </FormField>

      <Button type="submit" size="lg" fullWidth loading={pending}>
        Publish post
      </Button>
    </form>
  );
}
