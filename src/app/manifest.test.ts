// @vitest-environment node
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "./manifest";

describe("web app manifest (PWA-AC-01/02)", () => {
  const m = manifest();

  it("launches standalone into Home", () => {
    expect(m.display).toBe("standalone");
    expect(m.start_url).toBe("/home");
    expect(m.name).toBe("CAMPUS HELPER");
  });

  it("has 192px, 512px and maskable icons that exist in public/", () => {
    const icons = m.icons ?? [];
    expect(icons.map((icon) => icon.sizes)).toEqual(expect.arrayContaining(["192x192", "512x512"]));
    expect(icons.some((icon) => icon.purpose === "maskable")).toBe(true);
    for (const icon of icons) {
      expect(existsSync(join(process.cwd(), "public", icon.src))).toBe(true);
    }
  });
});
