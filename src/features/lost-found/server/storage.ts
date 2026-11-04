import "server-only";

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export interface StoredImage {
  bytes: Uint8Array;
  type: string;
}

/**
 * Where uploaded photos live. The disk implementation keeps the bytes outside
 * `public/` so they are only reachable through the authorised route, which also
 * means the same interface can be backed by object storage later.
 */
export interface ImageStorage {
  /** Stores the bytes and returns the URL a browser can request. */
  put(key: string, bytes: Uint8Array, type: string): Promise<string>;
  read(key: string): Promise<StoredImage | null>;
  remove(key: string): Promise<void>;
}

const KEY = /^[A-Za-z0-9_-]{8,64}$/;

export function createDiskImageStorage(
  dir = process.env.LOST_FOUND_UPLOAD_DIR ?? ".data/lost-found",
): ImageStorage {
  const root = path.resolve(process.cwd(), dir);
  const fileFor = (key: string, ext: "bin" | "json") => path.join(root, `${key}.${ext}`);

  return {
    async put(key, bytes, type) {
      if (!KEY.test(key)) throw new Error("Invalid storage key.");
      await mkdir(root, { recursive: true });
      await writeFile(fileFor(key, "bin"), bytes);
      await writeFile(fileFor(key, "json"), JSON.stringify({ type }));
      return `/api/lost-found/images/${key}`;
    },

    async read(key) {
      if (!KEY.test(key)) return null;
      try {
        const [bytes, meta] = await Promise.all([
          readFile(fileFor(key, "bin")),
          readFile(fileFor(key, "json"), "utf8"),
        ]);
        const type = (JSON.parse(meta) as { type?: unknown }).type;
        if (typeof type !== "string") return null;
        return { bytes: new Uint8Array(bytes), type };
      } catch {
        return null;
      }
    },

    async remove(key) {
      if (!KEY.test(key)) return;
      await rm(fileFor(key, "bin"), { force: true });
      await rm(fileFor(key, "json"), { force: true });
    },
  };
}
