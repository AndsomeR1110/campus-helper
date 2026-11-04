import { describe, expect, it } from "vitest";

import { MAX_IMAGE_BYTES } from "../constants";
import { sniffImageType, validateImageUpload } from "../image";
import { LostFoundError } from "../rules";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const WEBP = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38,
]);
const TEXT = new Uint8Array([0x3c, 0x68, 0x74, 0x6d, 0x6c, 0x3e]);

describe("sniffImageType (LF-AC-03)", () => {
  it("recognises the three accepted formats by their magic bytes", () => {
    expect(sniffImageType(PNG)).toBe("image/png");
    expect(sniffImageType(JPEG)).toBe("image/jpeg");
    expect(sniffImageType(WEBP)).toBe("image/webp");
  });

  it("rejects anything else, whatever the file is called", () => {
    expect(sniffImageType(TEXT)).toBeNull();
    expect(sniffImageType(new Uint8Array([]))).toBeNull();
  });
});

describe("validateImageUpload", () => {
  it("accepts a matching file", () => {
    expect(validateImageUpload({ declaredType: "image/png", size: PNG.length, bytes: PNG })).toBe(
      "image/png",
    );
  });

  it("trusts only the metadata for the client-side hint", () => {
    expect(validateImageUpload({ declaredType: "image/webp", size: 1024 })).toBe("image/webp");
  });

  it("rejects a disallowed type, an empty file and an oversized file", () => {
    const cases = [
      { declaredType: "image/gif", size: 1024 },
      { declaredType: "image/png", size: 0 },
      { declaredType: "image/png", size: MAX_IMAGE_BYTES + 1 },
    ];
    for (const upload of cases) {
      expect(() => validateImageUpload(upload)).toThrow(LostFoundError);
    }
  });

  it("rejects content that does not match the declared type", () => {
    expect(() => validateImageUpload({ declaredType: "image/png", size: 6, bytes: TEXT })).toThrow(
      LostFoundError,
    );
    expect(() =>
      validateImageUpload({ declaredType: "image/png", size: JPEG.length, bytes: JPEG }),
    ).toThrow(LostFoundError);
  });
});
