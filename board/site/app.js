import { COLUMNS, MEMBERS, REPO, buildBoard, memberForLogin, timeAgo } from "./lib.js";

const API = `https://api.github.com/repos/${REPO.owner}/${REPO.name}`;
const REPO_URL = `https://github.com/${REPO.owner}/${REPO.name}`;
const CACHE_KEY = "board-cache-v1";
const CACHE_MS = 60_000; // GitHub allows 60 unauthenticated requests per hour per IP.
const AUTO_REFRESH_MS = 5 * 60_000;
const DONE_PREVIEW = 8;

const $ = (id) => document.getElementById(id);

/** Tiny element builder. Text always goes through textContent (titles come from GitHub users). */
function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === false || value == null) continue;
    if (key === "class") el.className = value;
    else if (key.startsWith("on")) el.addEventListener(key.slice(2), value);
    else el.setAttribute(key, value === true ? "" : value);
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

class RateLimitError extends Error {
  constructor(reset) {
    super("rate limited");
    this.reset = reset;
  }
}

async function get(path) {
  const response = await fetch(`${API}${path}`, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (response.status === 403 || response.status === 429) {
    const reset = Number(response.headers.get("x-ratelimit-reset")) * 1000;
    throw new RateLimitError(Number.isFinite(reset) ? new Date(reset) : null);
  }
  if (!response.ok) throw new Error(`GitHub 返回 ${response.status}`);
  return response.json();
}

async function load(force = false) {
  if (!force) {
    try {
      const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) ?? "null");
      if (cached && Date.now() - cached.at < CACHE_MS) return cached;
    } catch {
      // Storage can be unavailable (private mode); just fetch.
    }
  }
  const [issues, openPulls, closedPulls] = await Promise.all([
    get("/issues?labels=task&state=all&per_page=100"),
    get("/pulls?state=open&per_page=50"),
    get("/pulls?state=closed&sort=updated&direction=desc&per_page=20"),
  ]);
  const data = { at: Date.now(), issues, openPulls, closedPulls };
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // Ignore quota / privacy errors.
  }
  return data;
}

/* ---- state -------------------------------------------------------------- */

let data = null;
let filter = /^#(M[1-5])$/.test(location.hash) ? location.hash.slice(1) : "all";
let showAllDone = false;

function setFilter(next) {
  filter = filter === next ? "all" : next;
  history.replaceState(null, "", filter === "all" ? location.pathname : `#${filter}`);
  render();
}

/* ---- rendering ---------------------------------------------------------- */

const memberLabel = (id) => id ?? "未分配";

function stat(value, label, { progress, danger } = {}) {
  return h(
    "div",
    { class: `stat${danger ? " danger" : ""}` },
    h("div", { class: "stat-value" }, value),
    h("div", { class: "stat-label" }, label),
    progress != null &&
      h("div", { class: "bar", "aria-hidden": "true" }, h("span", { style: `width:${progress}%` })),
  );
}

const pct = (done, total) => (total === 0 ? 0 : Math.round((done / total) * 100));

function renderStats(board) {
  const s = board.summary;
  $("stats").replaceChildren(
    stat(`${s.done} / ${s.total}`, `全部任务已完成 ${pct(s.done, s.total)}%`, {
      progress: pct(s.done, s.total),
    }),
    stat(`${s.p0Done} / ${s.p0Total}`, `P0 已完成 ${pct(s.p0Done, s.p0Total)}%`, {
      progress: pct(s.p0Done, s.p0Total),
    }),
    stat(s.blocked, "被阻塞的任务", { danger: s.blocked > 0 }),
    stat(s.openPulls, "开着的 PR"),
  );
}

function renderMembers(board) {
  $("members").replaceChildren(
    ...board.members.map((m) =>
      h(
        "button",
        {
          type: "button",
          class: "member",
          "aria-pressed": String(filter === m.id),
          onclick: () => setFilter(m.id),
        },
        h("div", { class: "member-name" }, `${m.id} · ${m.login}`),
        h("div", { class: "member-role" }, m.role),
        h(
          "div",
          { class: "bar", "aria-hidden": "true" },
          h("span", { style: `width:${pct(m.done, m.total)}%` }),
        ),
        h(
          "div",
          { class: "member-meta" },
          h("span", {}, `完成 ${m.done}/${m.total}`),
          h("span", {}, `进行中 ${m.active}`),
          m.blocked > 0 && h("span", { class: "badge blocked" }, `阻塞 ${m.blocked}`),
        ),
      ),
    ),
  );
}

function renderFilters(board) {
  const count = (id) =>
    board.tasks.filter((t) => (id === "all" ? true : t.owner === id) && t.column !== "done").length;
  const chip = (id, text) =>
    h(
      "button",
      {
        type: "button",
        class: "chip",
        "aria-pressed": String(filter === id),
        onclick: () => setFilter(id === "all" ? filter : id),
      },
      `${text} · ${count(id)}`,
    );
  $("filters").replaceChildren(chip("all", "全部"), ...MEMBERS.map((m) => chip(m.id, m.id)));
}

function card(task) {
  return h(
    "a",
    {
      class: `card${task.blocked ? " blocked" : ""}`,
      href: task.url,
      target: "_blank",
      rel: "noopener",
    },
    h("div", { class: "card-title" }, task.title),
    h(
      "div",
      { class: "card-meta" },
      h("span", {}, `#${task.number}`),
      h("span", { class: "badge owner" }, memberLabel(task.owner)),
      task.priority && h("span", { class: `badge ${task.priority.toLowerCase()}` }, task.priority),
      task.blocked && h("span", { class: "badge blocked" }, "阻塞"),
      ...task.pulls.map((pr) => h("span", { class: "badge pr" }, `PR #${pr.number}`)),
      h("span", {}, timeAgo(task.column === "done" ? task.closedAt : task.updatedAt)),
    ),
  );
}

function renderBoard(board) {
  const visible = board.tasks.filter((t) => filter === "all" || t.owner === filter);
  const order = { P0: 0, P1: 1 };
  $("board").replaceChildren(
    ...COLUMNS.map((column) => {
      let tasks = visible.filter((t) => t.column === column.id);
      tasks =
        column.id === "done"
          ? tasks.sort((a, b) => (b.closedAt ?? "").localeCompare(a.closedAt ?? ""))
          : tasks.sort(
              (a, b) =>
                Number(b.blocked) - Number(a.blocked) ||
                (order[a.priority] ?? 2) - (order[b.priority] ?? 2) ||
                a.number - b.number,
            );
      const hidden =
        column.id === "done" && !showAllDone ? Math.max(0, tasks.length - DONE_PREVIEW) : 0;
      const shown = hidden ? tasks.slice(0, DONE_PREVIEW) : tasks;
      return h(
        "section",
        { class: "column", "aria-label": column.title },
        h(
          "h3",
          { class: "column-title" },
          h("span", {}, column.title),
          h("span", { class: "muted" }, tasks.length),
        ),
        shown.length === 0 && h("div", { class: "column-empty" }, "暂无"),
        ...shown.map(card),
        hidden > 0 &&
          h(
            "button",
            { type: "button", class: "show-more", onclick: () => ((showAllDone = true), render()) },
            `显示其余 ${hidden} 个`,
          ),
      );
    }),
  );
}

function prItem(pr, { merged } = {}) {
  const author = memberForLogin(pr.user?.login);
  const stacked = !merged && pr.base?.ref && pr.base.ref !== "main";
  return h(
    "li",
    {},
    h("a", { href: pr.html_url, target: "_blank", rel: "noopener" }, `#${pr.number} ${pr.title}`),
    h(
      "div",
      { class: "card-meta" },
      h("span", { class: "badge owner" }, author ? author.id : (pr.user?.login ?? "?")),
      pr.draft && h("span", { class: "badge draft" }, "草稿"),
      stacked && h("span", { class: "badge stacked" }, `基于 ${pr.base.ref}`),
      pr.head?.repo &&
        pr.head.repo.full_name !== `${REPO.owner}/${REPO.name}` &&
        h("span", { class: "badge draft" }, "来自 fork"),
      h(
        "span",
        {},
        merged ? `合并于 ${timeAgo(pr.merged_at)}` : `更新于 ${timeAgo(pr.updated_at)}`,
      ),
    ),
  );
}

function renderPulls() {
  const mine = (pr) => filter === "all" || memberForLogin(pr.user?.login)?.id === filter;
  const open = data.openPulls.filter(mine);
  const merged = data.closedPulls.filter((pr) => pr.merged_at && mine(pr)).slice(0, 8);
  $("pulls").replaceChildren(
    ...(open.length ? open.map((pr) => prItem(pr)) : [h("li", { class: "muted" }, "暂无")]),
  );
  $("merged").replaceChildren(
    ...(merged.length
      ? merged.map((pr) => prItem(pr, { merged: true }))
      : [h("li", { class: "muted" }, "暂无")]),
  );
}

function render() {
  if (!data) return;
  const board = buildBoard(data.issues, data.openPulls);
  renderStats(board);
  renderMembers(board);
  renderFilters(board);
  renderBoard(board);
  renderPulls();
  $("updated").textContent =
    `数据更新于 ${new Date(data.at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })} · 每 5 分钟自动刷新`;
}

async function refresh(force = false) {
  const button = $("refresh");
  button.disabled = true;
  try {
    data = await load(force);
    $("error").hidden = true;
    render();
  } catch (error) {
    const box = $("error");
    box.hidden = false;
    box.textContent =
      error instanceof RateLimitError
        ? `GitHub 访问次数暂时用完（未登录每小时 60 次）${error.reset ? `，${error.reset.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })} 后恢复` : ""}。可以稍后再刷新。`
        : `读取 GitHub 失败：${error.message}。请检查网络后点「刷新」。`;
  } finally {
    button.disabled = false;
  }
}

$("new-task").href = `${REPO_URL}/issues/new?template=task.yml`;
$("refresh").addEventListener("click", () => refresh(true));
window.addEventListener("hashchange", () => {
  filter = /^#(M[1-5])$/.test(location.hash) ? location.hash.slice(1) : "all";
  render();
});
setInterval(() => {
  if (document.visibilityState === "visible") refresh(true);
}, AUTO_REFRESH_MS);
refresh();
