"use client";

import { useRouter } from "next/navigation";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { Button, FormField, Input, Select, Textarea, toast } from "@/components/ui";
import {
  CATEGORY_LABELS,
  MAX_DESCRIPTION_LENGTH,
  MAX_IMAGES,
  MAX_TITLE_LENGTH,
  POST_CATEGORIES,
  POST_KIND_LABELS,
} from "../constants";
import type { ImageMeta } from "../types";
import { validatePostInput, type FieldErrors } from "../validation";

function toIso(value: FormDataEntryValue | null): string {
  if (typeof value !== "string" || value === "") return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
}

/** Create-post form (PG-15, FR-LF-02). Validation runs twice: here and in the route. */
export function PostForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState(false);
  const [image, setImage] = useState<ImageMeta | null>(null);

  function pickImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setImage(file ? { name: file.name, type: file.type, size: file.size } : null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = validatePostInput({
      kind: form.get("kind"),
      title: form.get("title"),
      category: form.get("category"),
      location: form.get("location"),
      occurredAt: toIso(form.get("occurredAt")),
      description: form.get("description"),
      image,
    });

    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }

    setErrors({});
    setPending(true);
    try {
      const response = await fetch("/api/lost-found/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.value),
      });
      const body = await response.json();
      if (!response.ok) {
        if (body?.error?.fields) setErrors(body.error.fields as FieldErrors);
        toast.error(body?.error?.message ?? "Could not publish this post.");
        return;
      }
      toast.success("Post published");
      router.push(`/lost-found/${body.data.post.id}`);
      router.refresh();
    } catch {
      toast.error("Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <FormField label="Type" required error={errors.kind}>
        <Select name="kind" defaultValue="LOST">
          <option value="LOST">{POST_KIND_LABELS.LOST}</option>
          <option value="FOUND">{POST_KIND_LABELS.FOUND}</option>
        </Select>
      </FormField>

      <FormField
        label="Title"
        required
        error={errors.title}
        hint={`Up to ${MAX_TITLE_LENGTH} characters.`}
      >
        <Input name="title" placeholder="Blue water bottle" autoComplete="off" />
      </FormField>

      <FormField label="Category" required error={errors.category}>
        <Select name="category" defaultValue="OTHER">
          {POST_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {CATEGORY_LABELS[category]}
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
        <Input name="location" placeholder="Library, 3rd floor" autoComplete="off" />
      </FormField>

      <FormField
        label="When did it happen?"
        required
        error={errors.occurredAt}
        hint="You cannot pick a time in the future."
      >
        <Input name="occurredAt" type="datetime-local" />
      </FormField>

      <FormField
        label="Description"
        required
        error={errors.description}
        hint={`Do not include phone numbers, ID numbers or other private details. Up to ${MAX_DESCRIPTION_LENGTH} characters.`}
      >
        <Textarea
          name="description"
          rows={5}
          placeholder="Colour, brand, marks, or where you last saw it."
        />
      </FormField>

      <FormField
        label="Photo (optional)"
        error={errors.image}
        hint={`PNG, JPEG or WebP, up to 5 MB, ${MAX_IMAGES} photo.`}
      >
        <Input
          name="image"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={pickImage}
        />
      </FormField>

      <Button type="submit" size="lg" fullWidth loading={pending}>
        Publish post
      </Button>
    </form>
  );
}
