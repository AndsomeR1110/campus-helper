import { describe, expect, it } from "vitest";
import {
  buildBoard,
  cleanTitle,
  closedIssueNumbers,
  columnOf,
  formField,
  linkPullRequests,
  ownerOf,
  timeAgo,
} from "./site/lib.js";

const issue = (overrides = {}) => ({
  number: 1,
  title: "[M2] 登录",
  state: "open",
  labels: [],
  assignees: [],
  body: "",
  html_url: "https://github.com/x/y/issues/1",
  updated_at: "2026-11-04T00:00:00Z",
  ...overrides,
});

describe("ownerOf", () => {
  it("prefers the owner label", () => {
    expect(
      ownerOf(issue({ labels: [{ name: "owner:M3" }], assignees: [{ login: "WUCANXI" }] })),
    ).toBe("M3");
  });
  it("falls back to the issue-form field", () => {
    expect(
      ownerOf(issue({ body: "### 负责人\n\nM5 · 失物招领与管理后台\n\n### 优先级\n\nP0" })),
    ).toBe("M5");
  });
  it("falls back to the assignee", () => {
    expect(ownerOf(issue({ assignees: [{ login: "sayu666" }] }))).toBe("M4");
  });
  it("returns null when nobody owns it", () => {
    expect(ownerOf(issue())).toBeNull();
  });
});

describe("formField", () => {
  it("ignores GitHub's empty answer", () => {
    expect(formField("### 负责人\n\n_No response_", "负责人")).toBeNull();
  });
});

describe("closedIssueNumbers", () => {
  it("reads GitHub closing keywords", () => {
    expect(
      closedIssueNumbers({ title: "feat: x", body: "Closes #28\nfixes #3, Resolves: #4" }),
    ).toEqual([28, 3, 4]);
  });
  it("ignores plain mentions", () => {
    expect(closedIssueNumbers({ title: "see #7", body: "related to #9" })).toEqual([]);
  });
});

describe("columnOf", () => {
  const links = linkPullRequests([{ number: 40, title: "x", body: "Closes #2" }]);
  it("puts closed issues in done", () => {
    expect(
      columnOf(issue({ state: "closed", labels: [{ name: "status:in-progress" }] }), links),
    ).toBe("done");
  });
  it("puts issues with an open closing PR in review", () => {
    expect(columnOf(issue({ number: 2 }), links)).toBe("review");
  });
  it("uses the in-progress label", () => {
    expect(columnOf(issue({ labels: [{ name: "status:in-progress" }] }), links)).toBe("doing");
  });
  it("defaults to todo", () => {
    expect(columnOf(issue(), links)).toBe("todo");
  });
});

describe("buildBoard", () => {
  it("summarises progress per member and skips pull requests", () => {
    const board = buildBoard(
      [
        issue({ number: 1, labels: [{ name: "owner:M2" }, { name: "P0" }] }),
        issue({ number: 2, state: "closed", labels: [{ name: "owner:M2" }, { name: "P0" }] }),
        issue({ number: 3, labels: [{ name: "owner:M3" }, { name: "status:blocked" }] }),
        issue({ number: 4, pull_request: {} }),
      ],
      [],
    );
    expect(board.tasks).toHaveLength(3);
    expect(board.summary).toMatchObject({ total: 3, done: 1, p0Total: 2, p0Done: 1, blocked: 1 });
    expect(board.members.find((m) => m.id === "M2")).toMatchObject({ total: 2, done: 1 });
  });
});

it("cleanTitle strips the owner prefix", () => {
  expect(cleanTitle("[M4] 首页数据接入")).toBe("首页数据接入");
});

it("timeAgo", () => {
  const now = new Date("2026-11-04T12:00:00Z");
  expect(timeAgo("2026-11-04T11:55:00Z", now)).toBe("5 分钟前");
  expect(timeAgo("2026-11-01T12:00:00Z", now)).toBe("3 天前");
});
