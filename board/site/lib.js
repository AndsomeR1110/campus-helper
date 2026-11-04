// Pure helpers for the project board. No DOM, no network: unit-tested in
// board/lib.test.js. The page (app.js) fetches GitHub data and renders.

export const REPO = { owner: "AndsomeR1110", name: "campus-helper" };

/** Team members. `login` is the GitHub username used for assignees and PR authors. */
export const MEMBERS = [
  { id: "M1", name: "Member 1", login: "AndsomeR1110", role: "项目负责人 · UI · PWA · 部署" },
  { id: "M2", name: "Member 2", login: "WUCANXI", role: "登录与 Office Hour" },
  { id: "M3", name: "Member 3", login: "TimLi1203", role: "学习空间与我的预约" },
  { id: "M4", name: "Member 4", login: "sayu666", role: "课程、日程与通知" },
  { id: "M5", name: "Member 5", login: "HyZ7777", role: "失物招领与管理后台" },
];

/**
 * What each module hands to the others (docs/team-assignment.md,
 * docs/frontend-architecture.md §9). Deliberately coarse: it shows how one
 * member's work reaches the rest of the project, not every import.
 */
export const DEPENDENCIES = [
  { from: "M1", to: "M2", label: "设计系统与页面框架" },
  { from: "M1", to: "M3", label: "设计系统与页面框架" },
  { from: "M1", to: "M4", label: "设计系统、首页与 PWA" },
  { from: "M1", to: "M5", label: "设计系统与页面框架" },
  { from: "M2", to: "M3", label: "登录、数据库与 Office Hour 预约" },
  { from: "M2", to: "M4", label: "登录与 Office Hour 日程" },
  { from: "M2", to: "M5", label: "登录与管理员权限" },
  { from: "M3", to: "M4", label: "座位预约日程" },
];

/** Modules that build on `id`, directly or through another module, in member order. */
export function downstreamOf(id, deps = DEPENDENCIES) {
  const found = new Set();
  const queue = [id];
  while (queue.length) {
    const current = queue.shift();
    for (const dep of deps) {
      if (dep.from === current && dep.to !== id && !found.has(dep.to)) {
        found.add(dep.to);
        queue.push(dep.to);
      }
    }
  }
  return MEMBERS.map((m) => m.id).filter((m) => found.has(m));
}

/** Modules `id` builds on directly. */
export function upstreamOf(id, deps = DEPENDENCIES) {
  return deps.filter((d) => d.to === id).map((d) => d.from);
}

export const COLUMNS = [
  { id: "todo", title: "待开始" },
  { id: "doing", title: "进行中" },
  { id: "review", title: "审查中" },
  { id: "done", title: "已完成" },
];

const labelNames = (issue) => (issue.labels ?? []).map((l) => (typeof l === "string" ? l : l.name));

/** Reads a field written by the issue form, e.g. "### 负责人\n\nM3 · ...". */
export function formField(body, heading) {
  if (!body) return null;
  const match = new RegExp(`###\\s*${heading}\\s*\\n+([^\\n]+)`).exec(body);
  const value = match?.[1]?.trim();
  return value && value !== "_No response_" ? value : null;
}

/** Member id for an issue: owner label, then the issue-form field, then the assignee. */
export function ownerOf(issue) {
  for (const name of labelNames(issue)) {
    const match = /^owner:(M[1-5])$/.exec(name);
    if (match) return match[1];
  }
  const field = formField(issue.body, "负责人");
  const fromField = field && /M[1-5]/.exec(field);
  if (fromField) return fromField[0];
  for (const assignee of issue.assignees ?? []) {
    const member = MEMBERS.find((m) => m.login.toLowerCase() === assignee.login.toLowerCase());
    if (member) return member.id;
  }
  return null;
}

export function priorityOf(issue) {
  const names = labelNames(issue);
  if (names.includes("P0")) return "P0";
  if (names.includes("P1")) return "P1";
  const field = formField(issue.body, "优先级");
  return field && /P[01]/.exec(field) ? /P[01]/.exec(field)[0] : null;
}

export function isBlocked(issue) {
  return labelNames(issue).includes("status:blocked");
}

const CLOSING = /\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s*:?\s+#(\d+)/gi;

/** Issue numbers a PR closes ("Closes #28", "fixes #3, resolves #4"). */
export function closedIssueNumbers(pr) {
  const text = `${pr.title ?? ""}\n${pr.body ?? ""}`;
  return [...text.matchAll(CLOSING)].map((m) => Number(m[1]));
}

/** Map of issue number -> open PRs that will close it. */
export function linkPullRequests(pulls) {
  const links = new Map();
  for (const pr of pulls) {
    for (const number of closedIssueNumbers(pr)) {
      links.set(number, [...(links.get(number) ?? []), pr]);
    }
  }
  return links;
}

/** Board column for a task issue. */
export function columnOf(issue, links) {
  if (issue.state === "closed") return "done";
  if ((links.get(issue.number) ?? []).length > 0) return "review";
  if (labelNames(issue).includes("status:in-progress")) return "doing";
  return "todo";
}

/** "[M2] 登录…" -> "登录…" (the owner is shown separately). */
export function cleanTitle(title) {
  return title.replace(/^\s*\[M[1-5]\]\s*/, "");
}

export function memberForLogin(login) {
  return MEMBERS.find((m) => m.login.toLowerCase() === (login ?? "").toLowerCase()) ?? null;
}

/** Builds everything the page renders from raw GitHub API data. */
export function buildBoard(issues, openPulls) {
  const links = linkPullRequests(openPulls);
  const tasks = issues
    .filter((issue) => !issue.pull_request)
    .map((issue) => ({
      number: issue.number,
      title: cleanTitle(issue.title),
      url: issue.html_url,
      owner: ownerOf(issue),
      priority: priorityOf(issue),
      blocked: isBlocked(issue),
      column: columnOf(issue, links),
      pulls: (links.get(issue.number) ?? []).map((pr) => ({ number: pr.number, url: pr.html_url })),
      updatedAt: issue.updated_at,
      closedAt: issue.closed_at,
    }));

  const members = MEMBERS.map((member) => {
    const mine = tasks.filter((t) => t.owner === member.id);
    return {
      ...member,
      total: mine.length,
      done: mine.filter((t) => t.column === "done").length,
      active: mine.filter((t) => t.column === "doing" || t.column === "review").length,
      blocked: mine.filter((t) => t.blocked && t.column !== "done").length,
    };
  });

  const p0 = tasks.filter((t) => t.priority === "P0");
  const byColumn = Object.fromEntries(
    COLUMNS.map((c) => [c.id, tasks.filter((t) => t.column === c.id).length]),
  );
  return {
    tasks,
    members,
    summary: {
      total: tasks.length,
      done: tasks.filter((t) => t.column === "done").length,
      byColumn,
      p0Total: p0.length,
      p0Done: p0.filter((t) => t.column === "done").length,
      blocked: tasks.filter((t) => t.blocked && t.column !== "done").length,
      openPulls: openPulls.length,
    },
  };
}

/**
 * How one member's work shows up in the whole project:
 * - `points`: percentage points of overall progress their finished tasks add
 *   (all members' points sum to the overall completion percentage);
 * - `supports` / `waiting`: modules that build on theirs and those modules'
 *   unfinished tasks.
 */
export function impactOf(board, id) {
  const member = board.members.find((m) => m.id === id);
  if (!member) return null;
  const supports = downstreamOf(id);
  const open = board.tasks.filter((t) => t.owner === id && t.column !== "done");
  return {
    member,
    points: board.summary.total === 0 ? 0 : (member.done / board.summary.total) * 100,
    shareOfDone: board.summary.done === 0 ? 0 : (member.done / board.summary.done) * 100,
    supports: supports.map((to) => ({
      id: to,
      label: DEPENDENCIES.find((d) => d.from === id && d.to === to)?.label ?? null,
    })),
    uses: upstreamOf(id),
    waiting: board.tasks.filter((t) => supports.includes(t.owner) && t.column !== "done").length,
    open: open.length,
    openP0: open.filter((t) => t.priority === "P0").length,
  };
}

/** "3 天前" style relative time, in Chinese. */
export function timeAgo(iso, now = new Date()) {
  const minutes = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  return `${Math.round(hours / 24)} 天前`;
}
