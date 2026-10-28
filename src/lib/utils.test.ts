import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("joins conditional class names", () => {
    expect(cn("px-4", false && "hidden", "py-2")).toBe("px-4 py-2");
  });

  it("lets later utilities override earlier ones", () => {
    expect(cn("px-4", "px-6")).toBe("px-6");
    expect(cn("bg-primary", "bg-danger-solid")).toBe("bg-danger-solid");
  });

  it("keeps custom font-size and text-color tokens side by side", () => {
    expect(cn("text-title", "text-text-muted")).toBe("text-title text-text-muted");
    expect(cn("text-body", "text-caption")).toBe("text-caption");
  });
});
