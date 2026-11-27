import { describe, expect, it } from "vitest";
import { createTranslator, parseLocale } from "./messages";

describe("interface language", () => {
  it("recognizes the Chinese preference and defaults to English", () => {
    expect(parseLocale("zh-CN")).toBe("zh-CN");
    expect(parseLocale(undefined)).toBe("en");
    expect(parseLocale("unsupported")).toBe("en");
  });

  it("localizes calendar text with the appropriate placeholder order", () => {
    const date = { month: "11月", year: 2026 };
    expect(createTranslator("zh-CN")("{month} {year}", date)).toBe("2026 年 11月");
    expect(createTranslator("en")("{month} {year}", { ...date, month: "November" })).toBe(
      "November 2026",
    );
  });

  it("preserves unknown text and translates validation messages", () => {
    const t = createTranslator("zh-CN");
    expect(t("My blue notebook")).toBe("My blue notebook");
    expect(t("Enter a valid email address.")).toBe("请输入有效的邮箱地址。");
  });
});
