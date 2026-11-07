import { describe, expect, it } from "vitest";

import {
  canBook,
  canCancel,
  isSlotEnded,
  isSlotStarted,
  matchesKeyword,
  overlaps,
  validateSlotDuration,
} from "./rules";

/**
 * Office Hour 业务规则单元测试（纯函数，不碰数据库）。
 *
 * 测试名称标注对应 PRD 验收编号（CONTRIBUTING.md §9）。
 */

const at = (offsetMinutes: number) =>
  new Date(Date.UTC(2026, 10, 3, 2, 0) + offsetMinutes * 60_000);
const NOW = at(0);

describe("isSlotStarted / isSlotEnded", () => {
  it("treats a slot starting exactly now as already started (OH-AC-02)", () => {
    expect(isSlotStarted(at(0), NOW)).toBe(true);
  });

  it("treats a future slot as not started (OH-AC-02)", () => {
    expect(isSlotStarted(at(30), NOW)).toBe(false);
  });

  it("treats a slot whose end time passed as ended (OH-AC-05)", () => {
    expect(isSlotEnded(at(-30), NOW)).toBe(true);
    expect(isSlotEnded(at(30), NOW)).toBe(false);
  });
});

describe("canBook", () => {
  it("allows booking an open slot that has not started (OH-AC-02)", () => {
    expect(canBook({ startsAt: at(30), status: "OPEN" }, NOW)).toBe(true);
  });

  it("rejects a slot that already started (OH-AC-03)", () => {
    expect(canBook({ startsAt: at(-1), status: "OPEN" }, NOW)).toBe(false);
  });

  it("rejects a slot the teacher has withdrawn (OH-AC-07)", () => {
    expect(canBook({ startsAt: at(30), status: "CANCELLED" }, NOW)).toBe(false);
  });
});

describe("canCancel", () => {
  it("allows cancelling a confirmed future booking (OH-AC-05)", () => {
    expect(canCancel({ status: "CONFIRMED", startsAt: at(30) }, NOW)).toBe(true);
  });

  it("rejects cancelling a booking whose slot already started (OH-AC-05)", () => {
    expect(canCancel({ status: "CONFIRMED", startsAt: at(-1) }, NOW)).toBe(false);
  });

  it("rejects cancelling an already cancelled booking (OH-AC-05)", () => {
    expect(canCancel({ status: "CANCELLED", startsAt: at(30) }, NOW)).toBe(false);
  });
});

describe("validateSlotDuration", () => {
  it("accepts a 30 minute slot (OH-AC-06)", () => {
    expect(validateSlotDuration(at(0), at(30))).toBeNull();
  });

  it("rejects a slot shorter than the minimum (OH-AC-06)", () => {
    expect(validateSlotDuration(at(0), at(5))).toBe("TOO_SHORT");
  });

  it("rejects a slot longer than the maximum (OH-AC-06)", () => {
    expect(validateSlotDuration(at(0), at(180))).toBe("TOO_LONG");
  });

  it("rejects an end time before the start time (OH-AC-06)", () => {
    expect(validateSlotDuration(at(30), at(0))).toBe("TOO_SHORT");
  });
});

describe("overlaps", () => {
  it("detects overlapping ranges (OH-AC-06)", () => {
    expect(
      overlaps({ startsAt: at(0), endsAt: at(30) }, { startsAt: at(15), endsAt: at(45) }),
    ).toBe(true);
  });

  it("treats back-to-back ranges as not overlapping (OH-AC-06)", () => {
    expect(
      overlaps({ startsAt: at(0), endsAt: at(30) }, { startsAt: at(30), endsAt: at(60) }),
    ).toBe(false);
  });
});

describe("matchesKeyword", () => {
  const teacher = {
    displayName: "Dr. Wang",
    department: "Mathematical Sciences",
    keywords: ["calculus", "linear algebra"],
  };

  it("matches an empty query against everything (OH-AC-01)", () => {
    expect(matchesKeyword(teacher, "")).toBe(true);
  });

  it("matches by surname (OH-AC-01)", () => {
    expect(matchesKeyword(teacher, "wang")).toBe(true);
  });

  it("matches by course keyword (OH-AC-01)", () => {
    expect(matchesKeyword(teacher, "calculus")).toBe(true);
  });

  it("is case insensitive (OH-AC-01)", () => {
    expect(matchesKeyword(teacher, "WANG")).toBe(true);
  });

  it("rejects a non-matching keyword (OH-AC-01)", () => {
    expect(matchesKeyword(teacher, "physics")).toBe(false);
  });
});
