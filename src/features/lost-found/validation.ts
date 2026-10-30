/**
 * Hand-written input validation (LF-AC-02, LF-AC-03).
 *
 * CONTRIBUTING §6 asks for zod schemas in `schemas.ts`. zod is not a dependency
 * yet (`package.json` has no runtime validation library), and adding one would
 * require a new lockfile entry. These functions keep the same shape — a tagged
 * result plus a field → message map — so they can be swapped for zod schemas
 * without touching the callers. See INTEGRATION.md.
 */
import {
  ALLOWED_IMAGE_TYPES,
  MAX_CLAIM_MESSAGE_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_IMAGE_BYTES,
  MAX_IMAGES,
  MAX_LOCATION_LENGTH,
  MAX_REPORT_REASON_LENGTH,
  MAX_TITLE_LENGTH,
  MIN_CLAIM_MESSAGE_LENGTH,
  POST_CATEGORIES,
} from "./constants";
import type { ImageMeta, NewPostInput, PostCategory, PostKind } from "./types";

export type FieldErrors = Record<string, string>;

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; errors: FieldErrors };

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function isPostKind(value: unknown): value is PostKind {
  return value === "LOST" || value === "FOUND";
}

export function isPostCategory(value: unknown): value is PostCategory {
  return typeof value === "string" && POST_CATEGORIES.includes(value as PostCategory);
}

/** At most `MAX_IMAGES` photos, allowed MIME types only, `MAX_IMAGE_BYTES` each (LF-AC-03). */
export function validateImageMeta(
  value: unknown,
): { ok: true; value: ImageMeta | null } | { ok: false; message: string } {
  if (value === undefined || value === null) return { ok: true, value: null };

  const images = Array.isArray(value) ? value : [value];
  if (images.length > MAX_IMAGES)
    return { ok: false, message: `Attach at most ${MAX_IMAGES} photo.` };

  const first: unknown = images[0];
  if (typeof first !== "object" || first === null) {
    return { ok: false, message: "The photo could not be read." };
  }

  const file = first as { name?: unknown; type?: unknown; size?: unknown };
  const type = asText(file.type);
  const size = typeof file.size === "number" ? file.size : Number.NaN;

  if (!ALLOWED_IMAGE_TYPES.includes(type)) {
    return { ok: false, message: "Use a PNG, JPEG or WebP image." };
  }
  if (!Number.isFinite(size) || size <= 0) {
    return { ok: false, message: "The photo could not be read." };
  }
  if (size > MAX_IMAGE_BYTES) {
    return { ok: false, message: `Keep the photo under ${MAX_IMAGE_BYTES / (1024 * 1024)} MB.` };
  }

  return { ok: true, value: { name: asText(file.name) || "photo", type, size } };
}

/** Validates the create-post form (FR-LF-02, LF-AC-01, LF-AC-02). */
export function validatePostInput(input: unknown): ValidationResult<NewPostInput> {
  const raw = (typeof input === "object" && input !== null ? input : {}) as Record<string, unknown>;
  const errors: FieldErrors = {};

  const kind = raw.kind;
  if (!isPostKind(kind)) errors.kind = "Choose Lost or Found.";

  const title = asText(raw.title);
  if (!title) errors.title = "Enter a title.";
  else if (title.length > MAX_TITLE_LENGTH)
    errors.title = `Keep the title under ${MAX_TITLE_LENGTH} characters.`;

  const category = raw.category;
  if (!isPostCategory(category)) errors.category = "Choose a category.";

  const location = asText(raw.location);
  if (!location) errors.location = "Enter where it was lost or found.";
  else if (location.length > MAX_LOCATION_LENGTH)
    errors.location = `Keep the location under ${MAX_LOCATION_LENGTH} characters.`;

  const description = asText(raw.description);
  if (!description) errors.description = "Describe the item.";
  else if (description.length > MAX_DESCRIPTION_LENGTH)
    errors.description = `Keep the description under ${MAX_DESCRIPTION_LENGTH} characters.`;

  const occurredAtText = asText(raw.occurredAt);
  let occurredAt = "";
  if (!occurredAtText) {
    errors.occurredAt = "Enter the date and time.";
  } else {
    const time = Date.parse(occurredAtText);
    if (Number.isNaN(time)) errors.occurredAt = "Use a valid date and time.";
    else if (time > Date.now() + 5 * 60 * 1000)
      errors.occurredAt = "The time cannot be in the future.";
    else occurredAt = new Date(time).toISOString();
  }

  const image = validateImageMeta(raw.image);
  if (!image.ok) errors.image = image.message;

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      kind: kind as PostKind,
      title,
      category: category as PostCategory,
      location,
      occurredAt,
      description,
      image: image.ok ? image.value : null,
    },
  };
}

/** The private claim description (FR-LF-05, LF-AC-05). */
export function validateClaimInput(input: unknown): ValidationResult<{ message: string }> {
  const raw = (typeof input === "object" && input !== null ? input : {}) as Record<string, unknown>;
  const message = asText(raw.message);
  if (message.length < MIN_CLAIM_MESSAGE_LENGTH) {
    return {
      ok: false,
      errors: {
        message: `Explain how you can prove it is yours (at least ${MIN_CLAIM_MESSAGE_LENGTH} characters).`,
      },
    };
  }
  if (message.length > MAX_CLAIM_MESSAGE_LENGTH) {
    return {
      ok: false,
      errors: { message: `Keep it under ${MAX_CLAIM_MESSAGE_LENGTH} characters.` },
    };
  }
  return { ok: true, value: { message } };
}

/** Reason shown to the moderator (FR-LF-08). */
export function validateReportInput(input: unknown): ValidationResult<{ reason: string }> {
  const raw = (typeof input === "object" && input !== null ? input : {}) as Record<string, unknown>;
  const reason = asText(raw.reason);
  if (!reason) return { ok: false, errors: { reason: "Tell us what is wrong with this post." } };
  if (reason.length > MAX_REPORT_REASON_LENGTH) {
    return {
      ok: false,
      errors: { reason: `Keep it under ${MAX_REPORT_REASON_LENGTH} characters.` },
    };
  }
  return { ok: true, value: { reason } };
}
