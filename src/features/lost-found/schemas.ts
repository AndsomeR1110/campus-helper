import { z } from "zod";

import {
  ALLOWED_IMAGE_TYPES,
  CATEGORY_LABELS,
  CLAIM_MAX_LENGTH,
  CLAIM_MIN_LENGTH,
  DESCRIPTION_MAX_LENGTH,
  DESCRIPTION_MIN_LENGTH,
  LOCATION_MAX_LENGTH,
  LOCATION_MIN_LENGTH,
  MAX_IMAGE_BYTES,
  MAX_IMAGES,
  POST_CATEGORIES,
  REPORT_MAX_LENGTH,
  REPORT_MIN_LENGTH,
  TITLE_MAX_LENGTH,
  TITLE_MIN_LENGTH,
} from "./constants";

/**
 * Request schemas for the Lost & Found routes. Shared by the client forms and
 * the route handlers, so a field is validated the same way on both sides.
 *
 * NOTE: no `z.coerce`, no defaults — the handlers must reject unknown shapes
 * instead of guessing, which is why every object is strict.
 */

export const imageMetaSchema = z.strictObject({
  name: z.string().trim().min(1).max(180),
  type: z.enum(ALLOWED_IMAGE_TYPES),
  size: z.number().int().positive().max(MAX_IMAGE_BYTES),
});

export type ImageMetaInput = z.infer<typeof imageMetaSchema>;

export const postInputSchema = z
  .strictObject({
    kind: z.enum(["LOST", "FOUND"]),
    category: z.enum(POST_CATEGORIES),
    title: z
      .string()
      .trim()
      .min(TITLE_MIN_LENGTH, `Title needs at least ${TITLE_MIN_LENGTH} characters.`)
      .max(TITLE_MAX_LENGTH, `Title must be ${TITLE_MAX_LENGTH} characters or fewer.`),
    description: z
      .string()
      .trim()
      .min(
        DESCRIPTION_MIN_LENGTH,
        `Description needs at least ${DESCRIPTION_MIN_LENGTH} characters.`,
      )
      .max(
        DESCRIPTION_MAX_LENGTH,
        `Description must be ${DESCRIPTION_MAX_LENGTH} characters or fewer.`,
      ),
    location: z
      .string()
      .trim()
      .min(LOCATION_MIN_LENGTH, "Say where the item was lost or found.")
      .max(LOCATION_MAX_LENGTH, `Location must be ${LOCATION_MAX_LENGTH} characters or fewer.`),
    occurredAt: z.iso.datetime({ message: "Use an ISO date and time." }),
    image: imageMetaSchema.nullish().transform((value) => value ?? null),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (MAX_IMAGES < 1 && value.image) {
      ctx.addIssue({
        code: "custom",
        path: ["image"],
        message: "Photos are not part of this release.",
      });
    }
  });

export type PostInput = z.infer<typeof postInputSchema>;

export const claimInputSchema = z.strictObject({
  message: z
    .string()
    .trim()
    .min(
      CLAIM_MIN_LENGTH,
      `Describe a detail the owner would know (at least ${CLAIM_MIN_LENGTH} characters).`,
    )
    .max(CLAIM_MAX_LENGTH, `Keep it under ${CLAIM_MAX_LENGTH} characters.`),
});

export type ClaimInput = z.infer<typeof claimInputSchema>;

export const reportInputSchema = z.strictObject({
  reason: z
    .string()
    .trim()
    .min(
      REPORT_MIN_LENGTH,
      `Tell the administrator what is wrong (at least ${REPORT_MIN_LENGTH} characters).`,
    )
    .max(REPORT_MAX_LENGTH, `Keep it under ${REPORT_MAX_LENGTH} characters.`),
});

export type ReportInput = z.infer<typeof reportInputSchema>;

/** `"CATEGORY"` in a URL query; anything unknown is dropped rather than trusted. */
export const categoryParamSchema = z.enum(POST_CATEGORIES);
export const kindParamSchema = z.enum(["LOST", "FOUND"]);

export const CATEGORY_OPTIONS = POST_CATEGORIES.map((value) => ({
  value,
  label: CATEGORY_LABELS[value],
}));
