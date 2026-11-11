import { describe, expect, it } from "vitest";
import { buildingFromLocation } from "./campus";

describe("buildingFromLocation", () => {
  it.each([
    ["Building D, room 425", "D"],
    ["Office C-308", "C"],
    ["B-301", "B"],
    ["Language Centre · Office C-308", "C"],
    ["D425", "D"],
    ["building h", "H"],
  ])("finds the building in %s", (location, code) => {
    expect(buildingFromLocation(location)?.code).toBe(code);
  });

  it.each(["SD 425", "Library 2F, near the windows", "Central bridge", "", "Z-101"])(
    "returns nothing for %s",
    (location) => {
      expect(buildingFromLocation(location)).toBeUndefined();
    },
  );
});
