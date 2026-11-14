import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Opacity modifiers on theme colours (`bg-surface/80`, `ring-primary/40`) compile
 * to `color-mix()` plus a static fallback taken from the *light* @theme value.
 * Browsers without color-mix (older Android Chrome / WebViews) then paint light
 * colours in dark mode. Use a per-theme token instead (e.g. bg-surface-translucent,
 * ring-primary-soft). black / white are the same in both themes, so they are fine.
 */
const PATTERN =
  /\b(?:bg|text|border|ring|from|via|to|fill|stroke|divide|outline|decoration|caret|accent|shadow)-(?!black\/|white\/)[a-z][a-z-]*\/\d+\b/g;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(tsx?|mdx?)$/.test(name) && !name.endsWith(".test.ts") ? [path] : [];
  });
}

describe("theme colours", () => {
  it("never use opacity modifiers on theme colours (breaks dark mode without color-mix)", () => {
    const root = join(process.cwd(), "src");
    const offenders = sourceFiles(root).flatMap((file) =>
      [...readFileSync(file, "utf8").matchAll(PATTERN)].map(
        (match) => `${relative(process.cwd(), file)}: ${match[0]}`,
      ),
    );
    expect(offenders).toEqual([]);
  });
});
