import {
  COLUMNS,
  MEMBERS,
  REPO,
  buildBoard,
  downstreamOf,
  impactOf,
  memberForLogin,
  timeAgo,
} from "./lib.js";

const API = `https://api.github.com/repos/${REPO.owner}/${REPO.name}`;
const REPO_URL = `https://github.com/${REPO.owner}/${REPO.name}`;
const SNAPSHOT_URL = "data.json"; // Written by .github/workflows/board.yml on every deploy.
const CACHE_KEY = "board-cache-v1";
const CACHE_MS = 60_000; // Live fallback only: GitHub allows 60 anonymous requests per hour per IP.
const AUTO_REFRESH_MS = 2 * 60_000;
const DONE_PREVIEW = 8;
const SVG_NS = "http://www.w3.org/2000/svg";

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

/** Same as h() for SVG elements. */
function s(tag, attrs = {}, ...children) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value != null && value !== false) el.setAttribute(key, value);
  }
  el.append(...children.flat().filter(Boolean));
  return el;
}

/** Inline stroke icons (24×24). */
const ICONS = {
  todo: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z",
  doing: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 2",
  review: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  done: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM8 12l3 3 5-6",
  blocked: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM5.6 5.6l12.8 12.8",
  pr: "M6 3v12M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM18 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM18 15V9a3 3 0 0 0-3-3h-4M13 3l-2 3 2 3",
  flag: "M5 21V4M5 4h11l-2 4 2 4H5",
  arrow: "M5 12h14M13 6l6 6-6 6",
};
const icon = (name, cls = "icon") =>
  s(
    "svg",
    { class: cls, viewBox: "0 0 24 24", "aria-hidden": "true" },
    s("path", { d: ICONS[name] }),
  );

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

/**
 * The published site reads a snapshot that GitHub Actions refreshes whenever an
 * issue or PR changes, so visitors never call the GitHub API themselves (one
 * campus network shares a single 60-per-hour anonymous quota). Without a
 * snapshot (local preview) it falls back to the live API.
 */
async function load(force = false) {
  let response = null;
  try {
    response = await fetch(`${SNAPSHOT_URL}?t=${Date.now()}`, { cache: "no-store" });
  } catch {
    // Offline or blocked: try the live API below.
  }
  if (response?.ok) return { ...(await response.json()), snapshot: true };
  return loadLive(force);
}

async function loadLive(force) {
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
let board = null;
let filter = /^#(M[1-5])$/.test(location.hash) ? location.hash.slice(1) : "all";
let showAllDone = false;

function setFilter(next) {
  filter = filter === next ? "all" : next;
  history.replaceState(null, "", filter === "all" ? location.pathname : `#${filter}`);
  render();
}

/* ---- shared pieces ------------------------------------------------------ */

const pct = (done, total) => (total === 0 ? 0 : Math.round((done / total) * 100));
const memberColor = (id) => (id ? `var(--${id.toLowerCase()})` : "var(--border-strong)");
const memberById = (id) => MEMBERS.find((m) => m.id === id) ?? null;

/** GitHub avatar with an initials fallback (offline, blocked images). */
function avatar(login, id, size = "md") {
  const wrap = h("span", {
    class: `avatar ${size}`,
    style: `--c:${memberColor(id)}`,
    "aria-hidden": "true",
  });
  const fallback = () => wrap.replaceChildren((id ?? login ?? "?").slice(0, 2).toUpperCase());
  if (!login) {
    fallback();
    return wrap;
  }
  const img = h("img", {
    src: `https://github.com/${encodeURIComponent(login)}.png?size=80`,
    alt: "",
    loading: "lazy",
    decoding: "async",
  });
  img.addEventListener("error", fallback, { once: true });
  wrap.append(img);
  return wrap;
}

/** Circular progress meter. */
function ring(value, { size = 132, stroke = 12, label } = {}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return h(
    "div",
    {
      class: "ring",
      style: `width:${size}px;height:${size}px`,
      role: "img",
      "aria-label": label ?? `${value}%`,
    },
    s(
      "svg",
      { viewBox: `0 0 ${size} ${size}`, "aria-hidden": "true" },
      s("circle", { class: "ring-track", cx: size / 2, cy: size / 2, r, "stroke-width": stroke }),
      s("circle", {
        class: "ring-value",
        cx: size / 2,
        cy: size / 2,
        r,
        "stroke-width": stroke,
        "stroke-dasharray": `${(c * value) / 100} ${c}`,
        transform: `rotate(-90 ${size / 2} ${size / 2})`,
      }),
    ),
    h("span", { class: "ring-label" }, h("strong", {}, value), h("small", {}, "%")),
  );
}

function bar(value, color) {
  return h(
    "div",
    { class: "bar", "aria-hidden": "true" },
    h("span", { style: `width:${value}%${color ? `;background:${color}` : ""}` }),
  );
}

/* ---- overview ----------------------------------------------------------- */

function renderProgress() {
  const sum = board.summary;
  const overall = pct(sum.done, sum.total);
  const p0 = pct(sum.p0Done, sum.p0Total);
  $("progress").replaceChildren(
    ring(overall, { label: `全部任务完成 ${overall}%` }),
    h(
      "div",
      { class: "progress-text" },
      h(
        "div",
        { class: "progress-big" },
        h("strong", {}, sum.done),
        ` / ${sum.total} 个任务已完成`,
      ),
      h(
        "div",
        { class: "progress-row" },
        h("span", {}, "P0 必做"),
        h("span", { class: "num" }, `${sum.p0Done}/${sum.p0Total} · ${p0}%`),
      ),
      bar(p0),
      h(
        "p",
        { class: "muted progress-note" },
        sum.total - sum.done > 0
          ? `距离全部完成还有 ${sum.total - sum.done} 个任务`
          : "全部任务已完成 🎉",
      ),
    ),
  );
}

function renderContrib() {
  const total = board.summary.total;
  const segments = board.members.filter((m) => m.done > 0);
  const stack = h(
    "div",
    {
      class: "stack",
      role: "img",
      "aria-label": `总进度 ${pct(board.summary.done, total)}%：${board.members
        .map((m) => `${m.id} 贡献 ${fmtPoints(impactOf(board, m.id).points)}`)
        .join("，")}`,
    },
    ...segments.map((m) =>
      h("button", {
        type: "button",
        class: `stack-seg${filter !== "all" && filter !== m.id ? " dim" : ""}`,
        style: `width:${(m.done / total) * 100}%;background:${memberColor(m.id)}`,
        title: `${m.id} · ${m.login}：完成 ${m.done} 个任务，为项目贡献 ${fmtPoints(impactOf(board, m.id).points)}`,
        tabindex: "-1",
        onclick: () => setFilter(m.id),
      }),
    ),
  );
  const legend = h(
    "ul",
    { class: "legend" },
    ...board.members.map((m) => {
      const impact = impactOf(board, m.id);
      return h(
        "li",
        {},
        h(
          "button",
          {
            type: "button",
            class: "legend-item",
            "aria-pressed": String(filter === m.id),
            onclick: () => setFilter(m.id),
          },
          h("span", { class: "dot", style: `background:${memberColor(m.id)}` }),
          h("span", { class: "legend-name" }, m.id, h("span", { class: "muted-inline" }, m.login)),
          h("span", { class: "legend-value" }, `+${fmtPoints(impact.points)}`),
        ),
      );
    }),
  );
  $("contrib").replaceChildren(
    h(
      "div",
      { class: "stack-wrap" },
      stack,
      h(
        "div",
        { class: "stack-scale muted", "aria-hidden": "true" },
        h("span", {}, "0%"),
        h("span", {}, "100%"),
      ),
    ),
    legend,
  );
}

const fmtPoints = (points) =>
  `${points >= 10 || points === 0 ? Math.round(points) : points.toFixed(1)}%`;

function stat(iconName, value, label, cls = "") {
  return h(
    "div",
    { class: `stat ${cls}` },
    h("span", { class: "stat-icon" }, icon(iconName)),
    h(
      "div",
      {},
      h("div", { class: "stat-value" }, value),
      h("div", { class: "stat-label" }, label),
    ),
  );
}

function renderStats() {
  const sum = board.summary;
  $("stats").replaceChildren(
    ...COLUMNS.map((c) => stat(c.id, sum.byColumn[c.id], c.title, `status-${c.id}`)),
    stat("blocked", sum.blocked, "被阻塞", sum.blocked > 0 ? "danger" : ""),
    stat("pr", sum.openPulls, "开着的 PR", "status-pr"),
  );
}

/* ---- project map -------------------------------------------------------- */

/**
 * Desktop layout (CSS grid, see .map in styles.css):
 *
 *            M3 ───────────╮
 *          ↗    ↘          ↘
 *        M2 ─────→ M4 ─────→ 上线
 *          ↘               ↗
 *            M5 ───────────╯
 *   ════════════ M1 地基 ════════════
 */
const FLOW = [
  ["M2", "M3"],
  ["M2", "M4"],
  ["M2", "M5"],
  ["M3", "M4"],
  ["M4", "goal"],
];
/** Edges that skip a column run straight across and drop into the goal from above / below. */
const ELBOWS = [
  ["M3", "goal", "top"],
  ["M5", "goal", "bottom"],
];
const PILLARS = ["M2", "M5", "M4"]; // M1 holds up every column.

function highlighted() {
  if (filter === "all") return null;
  return new Set([filter, ...downstreamOf(filter), "goal"]);
}

function supportText(id) {
  const down = downstreamOf(id);
  if (id === "M1") return "地基：支撑所有模块";
  if (down.length) return `支撑 ${down.join(" · ")}`;
  return id === "M4" ? "汇总大家的数据给用户" : "直接交付给用户";
}

function mapNode(m) {
  const lit = highlighted();
  const state =
    filter === m.id ? "is-selected" : lit?.has(m.id) ? "is-impacted" : lit ? "is-dim" : "";
  const percent = pct(m.done, m.total);
  return h(
    "button",
    {
      type: "button",
      class: `node ${m.id === "M1" ? "foundation" : ""} ${state}`,
      "data-node": m.id,
      style: `--c:${memberColor(m.id)}`,
      "aria-pressed": String(filter === m.id),
      "aria-label": `${m.id} ${m.login}，${m.role}，完成 ${m.done}/${m.total}，${supportText(m.id)}`,
      onclick: () => setFilter(m.id),
    },
    h(
      "span",
      { class: "node-head" },
      avatar(m.login, m.id, "sm"),
      h("span", { class: "node-id" }, m.id),
      h("span", { class: "node-login" }, m.login),
    ),
    h("span", { class: "node-role" }, m.role),
    h(
      "span",
      { class: "node-progress" },
      bar(percent, memberColor(m.id)),
      h("span", { class: "num" }, `${m.done}/${m.total}`),
    ),
    h(
      "span",
      { class: "node-meta" },
      m.active > 0 && h("span", {}, `进行中 ${m.active}`),
      m.blocked > 0 &&
        h("span", { class: "badge blocked" }, icon("blocked", "icon xs"), `阻塞 ${m.blocked}`),
      h("span", { class: "node-support" }, icon("arrow", "icon xs"), supportText(m.id)),
    ),
  );
}

function goalNode() {
  const sum = board.summary;
  const overall = pct(sum.done, sum.total);
  return h(
    "div",
    { class: "node goal", "data-node": "goal" },
    ring(overall, { size: 84, stroke: 9, label: `项目完成 ${overall}%` }),
    h("span", { class: "goal-title" }, icon("flag", "icon xs"), "CAMPUS HELPER 上线"),
    h("span", { class: "muted" }, `P0 ${sum.p0Done}/${sum.p0Total}`),
  );
}

function renderMap() {
  const map = $("map");
  const svg = $("map-edges");
  map.replaceChildren(svg, ...board.members.map(mapNode), goalNode());
  drawEdges();
}

/** Draws the arrows between map nodes from their on-screen positions. */
function drawEdges() {
  const map = $("map");
  const svg = $("map-edges");
  if (!board || getComputedStyle(svg).display === "none") return;
  const box = map.getBoundingClientRect();
  const rect = (id) => {
    const r = map.querySelector(`[data-node="${id}"]`)?.getBoundingClientRect();
    return r && { x: r.left - box.left, y: r.top - box.top, w: r.width, h: r.height };
  };
  const lit = highlighted();
  const stateOf = (from, to) => {
    if (!lit) return "";
    const active = (from === filter || downstreamOf(filter).includes(from)) && lit.has(to);
    return active ? "active" : "dim";
  };

  // Spread several arrows leaving / entering the same node along its side.
  const anchors = (id, side, others) => {
    const r = rect(id);
    const sorted = [...others].sort(
      (a, b) => rect(a).y + rect(a).h / 2 - (rect(b).y + rect(b).h / 2),
    );
    const spread = Math.min(r.h * 0.6, 18 * (sorted.length - 1));
    return Object.fromEntries(
      sorted.map((other, i) => [
        other,
        {
          x: side === "right" ? r.x + r.w : r.x,
          y:
            r.y +
            r.h / 2 +
            (sorted.length > 1 ? -spread / 2 + (spread * i) / (sorted.length - 1) : 0),
        },
      ]),
    );
  };
  const outs = {};
  const ins = {};
  for (const [from, to] of FLOW) {
    (outs[from] ??= []).push(to);
    (ins[to] ??= []).push(from);
  }
  const outAnchor = Object.fromEntries(
    Object.entries(outs).map(([id, to]) => [id, anchors(id, "right", to)]),
  );
  const inAnchor = Object.fromEntries(
    Object.entries(ins).map(([id, from]) => [id, anchors(id, "left", from)]),
  );

  const marker = (id) =>
    s(
      "marker",
      {
        id,
        viewBox: "0 0 10 10",
        refX: 8,
        refY: 5,
        markerWidth: 7,
        markerHeight: 7,
        orient: "auto-start-reverse",
      },
      s("path", { d: "M1 1 9 5 1 9", class: "arrow-head" }),
    );

  const paths = FLOW.map(([from, to]) => {
    const a = outAnchor[from][to];
    const b = inAnchor[to][from];
    const dx = Math.max(24, (b.x - a.x) / 2);
    const state = stateOf(from, to);
    return s("path", {
      class: `edge ${state}`,
      d: `M${a.x} ${a.y} C${a.x + dx} ${a.y} ${b.x - dx} ${b.y} ${b.x - 2} ${b.y}`,
      "marker-end": `url(#arrow${state === "active" ? "-active" : ""})`,
    });
  });

  const elbows = ELBOWS.map(([from, to, side]) => {
    const a = rect(from);
    const b = rect(to);
    const x0 = a.x + a.w;
    const y0 = a.y + a.h / 2;
    const xg = b.x + b.w / 2;
    const yg = side === "top" ? b.y - 2 : b.y + b.h + 2;
    const r = Math.min(16, Math.abs(yg - y0) / 2, (xg - x0) / 2);
    const turn = side === "top" ? r : -r;
    // Fall back to a plain curve when the goal does not sit below / above the source.
    const straight = side === "top" ? yg <= y0 + r : yg >= y0 - r;
    const d = straight
      ? `M${x0} ${y0} C${(x0 + b.x) / 2} ${y0} ${(x0 + b.x) / 2} ${b.y + b.h / 2} ${b.x - 2} ${b.y + b.h / 2}`
      : `M${x0} ${y0} H${xg - r} Q${xg} ${y0} ${xg} ${y0 + turn} V${yg}`;
    const state = stateOf(from, to);
    return s("path", {
      class: `edge ${state}`,
      d,
      "marker-end": `url(#arrow${state === "active" ? "-active" : ""})`,
    });
  });

  const base = rect("M1");
  const pillars = PILLARS.map((to) => {
    const r = rect(to);
    const x = r.x + r.w / 2;
    const state = lit ? (filter === "M1" ? "active" : "dim") : "";
    return s("path", {
      class: `edge pillar ${state}`,
      d: `M${x} ${base.y} V${r.y + r.h + 4}`,
      "marker-end": `url(#arrow${state === "active" ? "-active" : ""})`,
    });
  });

  svg.setAttribute("viewBox", `0 0 ${box.width} ${box.height}`);
  svg.replaceChildren(
    s("defs", {}, marker("arrow"), marker("arrow-active")),
    ...pillars,
    ...paths,
    ...elbows,
  );
}

/* ---- impact panel ------------------------------------------------------- */

function renderImpact() {
  const el = $("impact");
  if (filter === "all") {
    const keystone = board.members
      .map((m) => ({ m, impact: impactOf(board, m.id) }))
      .filter(({ m }) => m.id !== "M1")
      .sort((a, b) => b.impact.waiting - a.impact.waiting)[0];
    el.className = "impact empty";
    el.replaceChildren(
      h(
        "p",
        {},
        h("strong", {}, "点下面的任意一位同学"),
        "，看 TA 完成的任务给项目带来了多少进度，以及有哪些模块在等 TA 的成果。",
      ),
      keystone &&
        keystone.impact.waiting > 0 &&
        h(
          "p",
          { class: "muted" },
          `目前牵动最多的是 ${keystone.m.id}（${keystone.m.role}）：${keystone.impact.waiting} 个其他同学的任务建立在它之上。`,
        ),
    );
    return;
  }
  const impact = impactOf(board, filter);
  const m = impact.member;
  const merged = data.closedPulls.filter(
    (pr) => pr.merged_at && memberForLogin(pr.user?.login)?.id === m.id,
  ).length;
  el.className = "impact";
  el.style.setProperty("--c", memberColor(m.id));
  el.replaceChildren(
    h(
      "div",
      { class: "impact-who" },
      avatar(m.login, m.id, "lg"),
      h(
        "div",
        {},
        h("div", { class: "impact-name" }, `${m.id} · ${m.login}`),
        h("div", { class: "muted" }, m.role),
      ),
      h("button", { type: "button", class: "btn ghost", onclick: () => setFilter(m.id) }, "看全部"),
    ),
    h(
      "dl",
      { class: "impact-metrics" },
      metric(
        `+${fmtPoints(impact.points)}`,
        "为总进度贡献",
        `完成 ${m.done} 个任务，占全组已完成的 ${fmtPoints(impact.shareOfDone)}${merged ? `；最近合并 ${merged} 个 PR` : ""}`,
      ),
      metric(
        impact.supports.length ? String(impact.supports.length) : "—",
        "支撑的模块",
        impact.supports.length ? impact.supports.map((x) => x.id).join("、") : "成果直接交付给用户",
      ),
      metric(
        String(impact.waiting),
        "下游未完成任务",
        impact.waiting ? "这些任务用到你的成果" : "暂时没有任务在等你",
      ),
      metric(
        String(impact.open),
        "我还剩的任务",
        impact.open
          ? `其中 P0 ${impact.openP0} 个${m.blocked ? `，阻塞 ${m.blocked} 个` : ""}`
          : "全部完成 🎉",
      ),
    ),
    (impact.supports.length > 0 || impact.uses.length > 0) &&
      h(
        "div",
        { class: "impact-links" },
        impact.uses.length > 0 &&
          h(
            "span",
            { class: "muted" },
            "用到 ",
            ...impact.uses.map((id) =>
              h(
                "span",
                { class: "tag" },
                h("span", { class: "dot", style: `background:${memberColor(id)}` }),
                id,
              ),
            ),
          ),
        ...impact.supports.map((x) =>
          h(
            "span",
            { class: "tag", title: memberById(x.id)?.role },
            h("span", { class: "dot", style: `background:${memberColor(x.id)}` }),
            `→ ${x.id}`,
            x.label && h("span", { class: "muted-inline" }, x.label),
          ),
        ),
      ),
  );
}

function metric(value, label, hint) {
  return h(
    "div",
    { class: "metric" },
    h("dt", {}, label),
    h(
      "dd",
      {},
      h("span", { class: "metric-value" }, value),
      h("span", { class: "metric-hint" }, hint),
    ),
  );
}

/* ---- task board --------------------------------------------------------- */

function renderFilters() {
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
      id !== "all" && h("span", { class: "dot", style: `background:${memberColor(id)}` }),
      text,
      h("span", { class: "chip-count" }, count(id)),
    );
  $("filters").replaceChildren(chip("all", "全部未完成"), ...MEMBERS.map((m) => chip(m.id, m.id)));
}

function card(task) {
  const owner = memberById(task.owner);
  return h(
    "a",
    {
      class: `card${task.blocked ? " blocked" : ""}`,
      href: task.url,
      target: "_blank",
      rel: "noopener",
      style: `--c:${memberColor(task.owner)}`,
    },
    h(
      "div",
      { class: "card-top" },
      h("span", { class: "card-number" }, `#${task.number}`),
      task.priority && h("span", { class: `badge ${task.priority.toLowerCase()}` }, task.priority),
      task.blocked && h("span", { class: "badge blocked" }, icon("blocked", "icon xs"), "阻塞"),
    ),
    h("div", { class: "card-title" }, task.title),
    h(
      "div",
      { class: "card-meta" },
      h("span", { class: "owner" }, avatar(owner?.login, task.owner, "xs"), task.owner ?? "未分配"),
      ...task.pulls.map((pr) =>
        h("span", { class: "badge pr" }, icon("pr", "icon xs"), `#${pr.number}`),
      ),
      h(
        "span",
        { class: "card-time" },
        timeAgo(task.column === "done" ? task.closedAt : task.updatedAt),
      ),
    ),
  );
}

function renderBoard() {
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
        { class: `column status-${column.id}`, "aria-label": column.title },
        h(
          "h3",
          { class: "column-title" },
          h("span", { class: "column-name" }, icon(column.id), column.title),
          h("span", { class: "column-count" }, tasks.length),
        ),
        shown.length === 0 && h("div", { class: "column-empty" }, "暂无任务"),
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

/* ---- pull requests ------------------------------------------------------ */

function prItem(pr, { merged } = {}) {
  const author = memberForLogin(pr.user?.login);
  const stacked = !merged && pr.base?.ref && pr.base.ref !== "main";
  return h(
    "li",
    { class: "pr-item", style: `--c:${memberColor(author?.id)}` },
    avatar(pr.user?.login, author?.id, "md"),
    h(
      "div",
      { class: "pr-body" },
      h("a", { href: pr.html_url, target: "_blank", rel: "noopener" }, `#${pr.number} ${pr.title}`),
      h(
        "div",
        { class: "card-meta" },
        h("span", { class: "badge owner" }, author ? author.id : (pr.user?.login ?? "?")),
        merged && h("span", { class: "badge merged" }, icon("done", "icon xs"), "已合并"),
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
    ),
  );
}

function renderPulls() {
  const mine = (pr) => filter === "all" || memberForLogin(pr.user?.login)?.id === filter;
  const open = data.openPulls.filter(mine);
  const merged = data.closedPulls.filter((pr) => pr.merged_at && mine(pr)).slice(0, 8);
  const empty = () => h("li", { class: "list-empty" }, "暂无");
  $("pulls").replaceChildren(...(open.length ? open.map((pr) => prItem(pr)) : [empty()]));
  $("merged").replaceChildren(
    ...(merged.length ? merged.map((pr) => prItem(pr, { merged: true })) : [empty()]),
  );
}

/* ---- page --------------------------------------------------------------- */

function render() {
  if (!data) return;
  board = buildBoard(data.issues, data.openPulls);
  document.body.classList.toggle("filtered", filter !== "all");
  renderProgress();
  renderContrib();
  renderStats();
  renderImpact();
  renderMap();
  renderFilters();
  renderBoard();
  renderPulls();
  const at = new Date(data.at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  $("updated").textContent = data.snapshot
    ? `数据同步于 ${at}（${timeAgo(new Date(data.at).toISOString())}）· Issue / PR 变化后约 1 分钟自动同步`
    : `数据更新于 ${at} · 直接读取 GitHub（本地预览）`;
}

async function refresh(force = false) {
  const button = $("refresh");
  button.disabled = true;
  button.classList.add("loading");
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
    button.classList.remove("loading");
  }
}

$("new-task").href = `${REPO_URL}/issues/new?template=task.yml`;
$("refresh").addEventListener("click", () => refresh(true));
window.addEventListener("hashchange", () => {
  filter = /^#(M[1-5])$/.test(location.hash) ? location.hash.slice(1) : "all";
  render();
});
new ResizeObserver(() => drawEdges()).observe($("map"));
setInterval(() => {
  if (document.visibilityState === "visible") refresh(true);
}, AUTO_REFRESH_MS);
refresh();
