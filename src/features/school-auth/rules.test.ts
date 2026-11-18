import { describe, expect, it } from "vitest";
import { credentialIssues, errorCopy, imageCodeIssue, sliderRatio } from "./rules";

describe("credentialIssues", () => {
  it("requires both fields", () => {
    expect(credentialIssues("", "")).toEqual({
      account: "Enter your university account.",
      password: "Enter your university password.",
    });
    expect(credentialIssues("   ", "x").account).toBeDefined();
  });

  it("never treats spaces in a password as empty or trims them", () => {
    expect(credentialIssues("student", " ").password).toBeUndefined();
  });

  it("applies the school's length limits", () => {
    expect(credentialIssues("a".repeat(65), "p").account).toMatch(/64/);
    expect(credentialIssues("a", "p".repeat(101)).password).toMatch(/100/);
    expect(credentialIssues("a".repeat(64), "p".repeat(100))).toEqual({});
  });
});

describe("imageCodeIssue", () => {
  it("asks for the exact number of characters", () => {
    expect(imageCodeIssue("", 4)).toMatch(/Enter the characters/);
    expect(imageCodeIssue("7K3", 4)).toMatch(/all 4/);
    expect(imageCodeIssue("7K-3", 4)).toMatch(/letters and numbers/);
    expect(imageCodeIssue("7K3P", 4)).toBeNull();
  });
});

describe("sliderRatio", () => {
  it("reports the piece position independent of screen scaling", () => {
    expect(sliderRatio(150, 300)).toBe(0.5);
    expect(sliderRatio(75, 150)).toBe(0.5);
  });

  it("clamps to the track and guards bad input", () => {
    expect(sliderRatio(-5, 300)).toBe(0);
    expect(sliderRatio(400, 300)).toBe(1);
    expect(sliderRatio(10, 0)).toBe(0);
  });
});

it("uses the school message only when the native side provides one", () => {
  expect(errorCopy({ kind: "rejected" }).text).toMatch(/didn’t accept/);
  expect(errorCopy({ kind: "rejected", message: "Custom." }).text).toBe("Custom.");
  expect(errorCopy({ kind: "not-activated" }).title).toBe("Activate your account first");
});
