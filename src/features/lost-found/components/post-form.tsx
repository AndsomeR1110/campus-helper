"use client";

import { useTranslations } from "@/lib/i18n/client";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { Button, DateTimePicker, FormField, Input, Select, Textarea, toast } from "@/components/ui";

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
  // The picker's "yyyy-mm-ddTHH:mm" is campus time (Asia/Shanghai, UTC+8 with no
  // daylight saving), like every other time in the app — not the browser's zone.
  return new Date(`${value}:00+08:00`).toISOString();
}

/** PG-15. Creates the post, then uploads the optional photo to the new id. */
export function PostForm() {
  const t = useTranslations();
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
        toast.error(payload.error?.message ?? t("The post could not be published."));
        return;
      }

      if (photo) {
        const body = new FormData();
        body.set("photo", photo);
        const upload = await fetch(`/api/lost-found/posts/${payload.data.id}/image`, {
          method: "POST",
          body,
        });
        if (!upload.ok) toast.error(t("Published, but the photo was not accepted."));
      }

      toast.success(t("Post published."));
      router.push(`/lost-found/${payload.data.id}`);
      router.refresh();
    } catch {
      toast.error(t("Network error. Try again when you are back online."));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <FormField label={t("Type")} required error={errors.kind}>
        <Select value={kind} onChange={(event) => setKind(event.target.value as PostKind)}>
          {(Object.keys(POST_KIND_LABELS) as PostKind[]).map((value) => (
            <option key={value} value={value}>
              {t(POST_KIND_LABELS[value])}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField
        label={t("Title")}
        required
        hint={t("Up to {count} characters.", { count: TITLE_MAX_LENGTH })}
        error={errors.title}
      >
        <Input name="title" maxLength={TITLE_MAX_LENGTH} placeholder={t("Blue water bottle")} />
      </FormField>

      <FormField label={t("Category")} required error={errors.category}>
        <Select
          value={category}
          onChange={(event) => setCategory(event.target.value as PostCategory)}
        >
          {POST_CATEGORIES.map((value) => (
            <option key={value} value={value}>
              {t(CATEGORY_LABELS[value])}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField
        label={t("Location")}
        required
        error={errors.location}
        hint={t("Building, floor or a nearby landmark.")}
      >
        <Input name="location" placeholder={t("Library, 3rd floor")} />
      </FormField>

      <FormField
        label={t("When did it happen?")}
        required
        error={errors.occurredAt}
        hint={t("You cannot pick a time in the future.")}
      >
        <DateTimePicker value={occurredAt} onChange={setOccurredAt} max="today" />
      </FormField>

      <FormField
        label={t("Description")}
        required
        error={errors.description}
        hint={t("Do not include phone numbers, ID numbers or other private details.")}
      >
        <Textarea
          name="description"
          rows={5}
          maxLength={DESCRIPTION_MAX_LENGTH}
          placeholder={t("Colour, brand, marks, or where you last saw it.")}
        />
      </FormField>

      <FormField
        label={t("Photo (optional)")}
        hint={t("PNG, JPEG or WebP, up to 5 MB.")}
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
        {t("Publish post")}
      </Button>
    </form>
  );
}
