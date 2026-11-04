import { describe, expect, it } from "vitest";

import { claimInputSchema, postInputSchema, reportInputSchema } from "../schemas";
import { VALID_POST } from "./fixtures";

describe("postInputSchema (LF-AC-02)", () => {
  it("accepts a complete post and normalises the optional image", () => {
    const parsed = postInputSchema.parse(VALID_POST);
    expect(parsed.title).toBe("Grey notebook");
    expect(parsed.image).toBeNull();
  });

  it("trims surrounding whitespace", () => {
    const parsed = postInputSchema.parse({ ...VALID_POST, title: "  Grey notebook  " });
    expect(parsed.title).toBe("Grey notebook");
  });

  it("rejects a too-short title and names the field", () => {
    const result = postInputSchema.safeParse({ ...VALID_POST, title: "abc" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["title"]);
  });

  it("rejects an unknown field instead of ignoring it", () => {
    const result = postInputSchema.safeParse({ ...VALID_POST, status: "RESOLVED" });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown category and a non-ISO date", () => {
    expect(postInputSchema.safeParse({ ...VALID_POST, category: "FOOD" }).success).toBe(false);
    expect(postInputSchema.safeParse({ ...VALID_POST, occurredAt: "2026-11-01" }).success).toBe(
      false,
    );
  });

  it("validates the image metadata when one is attached", () => {
    const image = { name: "bottle.png", type: "image/png", size: 2048 };
    expect(postInputSchema.parse({ ...VALID_POST, image }).image).toEqual(image);

    expect(
      postInputSchema.safeParse({ ...VALID_POST, image: { ...image, type: "image/gif" } }).success,
    ).toBe(false);
    expect(
      postInputSchema.safeParse({ ...VALID_POST, image: { ...image, size: 6 * 1024 * 1024 } })
        .success,
    ).toBe(false);
  });
});

describe("claimInputSchema", () => {
  it("needs a description only the owner could give", () => {
    expect(claimInputSchema.safeParse({ message: "It is mine." }).success).toBe(false);
    const long = "The case has a scratch on the back and I can show the serial number.";
    expect(claimInputSchema.parse({ message: long }).message).toBe(long);
  });
});

describe("reportInputSchema", () => {
  it("accepts a short explanation and rejects an empty one", () => {
    expect(
      reportInputSchema.parse({ reason: "Looks like a duplicate of the same calculator." }).reason,
    ).toContain("duplicate");
    expect(reportInputSchema.safeParse({ reason: "spam" }).success).toBe(false);
  });
});
