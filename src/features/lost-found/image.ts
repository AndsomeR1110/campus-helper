import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "./constants";
import { LostFoundError } from "./rules";

/**
 * Upload checks for the optional photo (LF-AC-03).
 *
 * A browser-supplied `type` is only a claim, so the bytes are sniffed as well.
 * `validateImageUpload` is called by the route handler with the real buffer, and
 * by the form with an empty buffer for the instant client-side hint — the server
 * call is the one that decides.
 */

type Sniffed = "image/png" | "image/jpeg" | "image/webp";

function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  if (bytes.length < signature.length) return false;
  return signature.every((byte, index) => bytes[index] === byte);
}

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG = [0xff, 0xd8, 0xff];
/** "RIFF" + 4 size bytes + "WEBP". */
const WEBP_HEAD = [0x52, 0x49, 0x46, 0x46];
const WEBP_TAIL = [0x57, 0x45, 0x42, 0x50];

/** Returns the real type of the bytes, or null when the file is not a supported image. */
export function sniffImageType(bytes: Uint8Array): Sniffed | null {
  if (startsWith(bytes, PNG)) return "image/png";
  if (startsWith(bytes, JPEG)) return "image/jpeg";
  if (startsWith(bytes, WEBP_HEAD) && startsWith(bytes.subarray(8), WEBP_TAIL)) return "image/webp";
  return null;
}

export interface ImageUpload {
  /** What the browser put in `Content-Type` / `file.type`. */
  declaredType: string;
  /** Byte length from the multipart part; never trust `file.size` alone. */
  size: number;
  /** The actual bytes, or an empty buffer when only the metadata is known. */
  bytes?: Uint8Array;
}

/** Throws a 400 `LostFoundError` with a field-level message the form can show. */
export function validateImageUpload(upload: ImageUpload): Sniffed {
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(upload.declaredType)) {
    throw new LostFoundError("VALIDATION_ERROR", "Use a PNG, JPEG or WebP photo.");
  }
  if (upload.size <= 0) {
    throw new LostFoundError("VALIDATION_ERROR", "The photo looks empty. Try another file.");
  }
  if (upload.size > MAX_IMAGE_BYTES) {
    throw new LostFoundError("VALIDATION_ERROR", "Photos must be 5 MB or smaller.");
  }

  if (!upload.bytes || upload.bytes.length === 0) {
    return upload.declaredType as Sniffed;
  }

  const actual = sniffImageType(upload.bytes);
  if (!actual) {
    throw new LostFoundError("VALIDATION_ERROR", "Only PNG, JPEG or WebP photos are accepted.");
  }
  if (actual !== upload.declaredType) {
    throw new LostFoundError("VALIDATION_ERROR", "The file content does not match its type.");
  }
  return actual;
}
