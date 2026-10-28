# CAMPUS HELPER — UI/UX Specification

| 项目 | 内容 |
|---|---|
| 文档编号 | 01 — UI/UX Specification（PRD 第 18 节） |
| 版本 | V1.0 Draft |
| 负责人 | Member 1（Ran An） |
| 适用范围 | 所有页面、公共组件、Figma 原型 |
| 实现位置 | Token：`src/app/globals.css`；组件：`src/components/ui/` |

本文档是全组的统一 UI 依据。Figma 中的样式名称、代码中的 Token 名称和组件名称三者保持一致。
文档中未覆盖的情况，先参考已有页面的处理方式，再在 Issue 中提出，由 Member 1 补充到本规范。

---

## 1. 设计原则

| 原则 | 具体要求 |
|---|---|
| **Mobile First** | 先设计 375px 手机布局，再扩展到平板和桌面。主操作放在拇指容易触及的下半屏。 |
| **Simple** | 每个页面只有一个主操作（Primary Button）。三步以内完成核心任务。 |
| **Reliable** | 任何操作都有明确反馈；结果以服务端返回为准，不显示虚假成功。 |
| **Consistent** | 相同的含义使用相同的颜色、图标和文案。 |
| **Honest** | 演示数据明确标注为学术项目数据，不模仿学校官方视觉标识。 |

> 本项目不使用学校 Logo、校徽或官方配色，避免测试用户误认为是学校官方系统（PRD 2.3）。

---

## 2. Design Tokens

### 2.1 颜色

所有颜色通过**语义化 Token** 使用。业务代码中**禁止**直接使用 Tailwind 原始色板类名（如 `bg-indigo-600`、`text-slate-500`），以便统一调整和后续支持深色模式。

#### 品牌色与中性色

| Token | 色值 | Tailwind 类示例 | 用途 |
|---|---|---|---|
| `primary` | `#4F46E5` | `bg-primary` `text-primary` | 主按钮、选中状态、链接 |
| `primary-hover` | `#4338CA` | `hover:bg-primary-hover` | 主按钮悬停 / 按下 |
| `primary-subtle` | `#EEF2FF` | `bg-primary-subtle` | 选中项背景、轻量强调 |
| `on-primary` | `#FFFFFF` | `text-on-primary` | 主色背景上的文字 |
| `background` | `#F8FAFC` | `bg-background` | 页面背景 |
| `surface` | `#FFFFFF` | `bg-surface` | 卡片、弹窗、导航栏 |
| `surface-muted` | `#F1F5F9` | `bg-surface-muted` | 输入框禁用、分组背景、骨架屏 |
| `border` | `#E2E8F0` | `border-border` | 卡片边框、分隔线 |
| `border-strong` | `#CBD5E1` | `border-border-strong` | 输入框边框 |
| `text` | `#0F172A` | `text-text` | 正文、标题 |
| `text-muted` | `#64748B` | `text-text-muted` | 次要信息、说明文字 |
| `text-disabled` | `#94A3B8` | `text-text-disabled` | 禁用文字（不得用于需要阅读的信息） |
| `focus-ring` | `#6366F1` | `ring-focus-ring` | 键盘焦点环 |

#### 语义色

每种语义色有三个 Token：`<name>`（文字 / 图标）、`<name>-subtle`（浅色背景）、`<name>-solid`（实心背景，配白色文字）。

| 语义 | `<name>` 文字色 | `<name>-subtle` 背景 | `<name>-solid` | 用途 |
|---|---|---|---|---|
| `success` | `#15803D` | `#F0FDF4` | `#15803D` | 预约成功、Approved、Resolved |
| `warning` | `#B45309` | `#FFFBEB` | `#B45309` | 待处理、即将开始、Pending |
| `danger` | `#B91C1C` | `#FEF2F2` | `#DC2626` | 错误、删除、取消预约、Rejected |
| `info` | `#2563EB` | `#EFF6FF` | `#2563EB` | 提示信息、Open 状态 |
| `neutral` | `#475569` | `#F1F5F9` | — | 已完成、已取消等非活跃状态 |

#### 日程事件类型色

Schedule、Home 和 My Bookings 中，三类事件使用固定的颜色 + 图标组合。**颜色不能是唯一区分方式**，必须同时显示图标或文字标签。

| 事件类型 | Token | 文字色 | 浅色背景 | 图标（lucide） |
|---|---|---|---|---|
| Class 课程 | `event-class` | `#2563EB` | `#EFF6FF` | `BookOpen` |
| Office Hour 教师预约 | `event-office` | `#7C3AED` | `#F5F3FF` | `UserRound` |
| Study Space 学习空间 | `event-space` | `#0F766E` | `#F0FDFA` | `Armchair` |

#### Lost & Found 帖子类型色

| 类型 | Token | 文字色 | 浅色背景 | 图标 |
|---|---|---|---|---|
| Lost 遗失 | `lost` | `#C2410C` | `#FFF7ED` | `SearchX` |
| Found 拾获 | `found` | `#047857` | `#ECFDF5` | `PackageCheck` |

> 上述文字色在白色和对应浅色背景上、`-solid` 色与白色文字搭配时，对比度均 ≥ 4.5:1（WCAG AA）。新增颜色时须先检查对比度。

### 2.2 状态标签映射（StatusBadge）

全项目的业务状态统一使用 `StatusBadge` 组件展示，颜色映射固定如下。各模块不得自定义状态颜色。

| 实体 | 状态（枚举值） | 显示文案 | 语义色 |
|---|---|---|---|
| OfficeBooking / SpaceBooking | `CONFIRMED` | Confirmed | success |
| | `COMPLETED` | Completed | neutral |
| | `CANCELLED` | Cancelled | neutral |
| | `EXPIRED` | Expired | neutral |
| OfficeSlot | `OPEN` | Available | info |
| | `BOOKED` | Booked | neutral |
| | `CANCELLED` | Withdrawn | danger |
| LostFoundPost | `OPEN` | Open | info |
| | `CLAIM_PENDING` | Claim pending | warning |
| | `RESOLVED` | Resolved | success |
| | `CLOSED` | Closed | neutral |
| | `HIDDEN` | Hidden（仅管理员可见） | danger |
| LostFoundClaim | `PENDING` | Pending | warning |
| | `APPROVED` | Approved | success |
| | `REJECTED` | Rejected | danger |
| Report | `PENDING` / `RESOLVED` / `DISMISSED` | Pending / Resolved / Dismissed | warning / success / neutral |

`neutral` 使用 `neutral-subtle` 背景 + `neutral` 文字（`text-muted` 在该背景上对比度不足，不可替代）。
枚举值以 Member 2 的 Prisma Schema 为准；若最终命名不同，在本表同步更新。

### 2.3 字体

| 项 | 规范 |
|---|---|
| 英文字体 | **Inter**（通过 `next/font` 加载） |
| 中文回退 | `"PingFang SC", "Noto Sans SC", "Microsoft YaHei", sans-serif`（P1 中文界面使用） |
| 数字 | 时间、日期和座位号使用 `tabular-nums`，保证对齐 |

**字号层级**（移动端与桌面端相同，桌面端不放大正文）：

| Token | 字号 / 行高 | 字重 | 用途 |
|---|---|---|---|
| `text-display` | 28 / 36 px | 700 | Home 欢迎语 |
| `text-title-lg` | 22 / 28 px | 600 | 页面标题（TopBar 大标题） |
| `text-title` | 18 / 26 px | 600 | 区块标题、弹窗标题 |
| `text-subtitle` | 16 / 24 px | 600 | 卡片标题、列表项主信息 |
| `text-body` | 16 / 24 px | 400 | 正文、**表单输入**（不得小于 16px，避免 iOS 自动缩放） |
| `text-body-sm` | 14 / 20 px | 400 | 次要信息、辅助说明 |
| `text-caption` | 12 / 16 px | 500 | 标签、徽章、时间戳 |

- 单个页面最多使用 3 种字号层级。
- 不使用 12px 以下的字号。

### 2.4 间距

基于 **4px 网格**，只使用以下值：`0 / 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64`（对应 Tailwind `0 / 1 / 2 / 3 / 4 / 5 / 6 / 8 / 10 / 12 / 16`）。

| 场景 | 值 |
|---|---|
| 页面左右边距 | 手机 16px，平板及以上 24px |
| 区块之间 | 24px |
| 卡片内边距 | 16px |
| 列表项之间 | 12px |
| 表单字段之间 | 16px |
| 图标与文字 | 8px |

### 2.5 圆角

| Token | 值 | 用途 |
|---|---|---|
| `rounded-sm` | 8px | 按钮、输入框、小标签 |
| `rounded-md` | 12px | 卡片、列表项 |
| `rounded-lg` | 16px | 弹窗、底部抽屉、大图片 |
| `rounded-full` | 9999px | 徽章、筛选 Chip、头像 |

### 2.6 阴影与层级

| Token | 用途 |
|---|---|
| `shadow-card` | `0 1px 2px rgb(15 23 42 / 0.06)`：卡片（与 1px 边框配合使用） |
| `shadow-overlay` | `0 8px 24px rgb(15 23 42 / 0.12)`：弹窗、下拉菜单、Toast |

| 层级（z-index） | 值 |
|---|---|
| TopBar / BottomNav | 30 |
| 下拉菜单 | 40 |
| Modal / BottomSheet 遮罩与内容 | 50 |
| Toast | 60 |

### 2.7 动效

- 时长：微交互 150ms，弹窗 / 抽屉 200ms；缓动 `ease-out`。
- 只对 `opacity` 和 `transform` 做动画。
- 必须尊重 `prefers-reduced-motion: reduce`，此时关闭位移动画，仅保留淡入淡出。

### 2.8 图标

- 统一使用 **lucide-react**，不混用其他图标库。
- 尺寸：列表 / 按钮内 20px，底部导航 24px，空状态插图 48px。
- 仅图标的按钮必须提供 `aria-label`。

---

## 3. 布局与响应式

### 3.1 断点

| 视口 | 测试宽度 | Tailwind 断点 | 布局 |
|---|---|---|---|
| 手机 | 375px | 默认 | 单列，底部导航 |
| 平板 | 768px | `md` | 单列加宽，列表可两列卡片，仍使用底部导航 |
| 桌面 | 1280px | `lg`（≥ 1024px） | 左侧导航栏 + 内容区，列表可三列卡片 |

### 3.2 App Shell

```
手机 / 平板                         桌面（≥ 1024px）
┌──────────────────────┐            ┌────────┬──────────────────────────┐
│ TopBar        56px   │            │        │ TopBar                   │
├──────────────────────┤            │ Side   ├──────────────────────────┤
│                      │            │ Nav    │                          │
│   Content            │            │ 240px  │  Content                 │
│   (左右 16px 边距)    │            │        │  max-width: 960px 居中    │
│                      │            │        │                          │
├──────────────────────┤            │        │                          │
│ BottomNav 64px       │            │        │                          │
│ + safe-area-inset    │            │        │                          │
└──────────────────────┘            └────────┴──────────────────────────┘
```

- 内容区底部预留 `64px + env(safe-area-inset-bottom)`，确保底部导航不遮挡任何按钮（PRD 11.2）。
- 详情页与表单页内容最大宽度 **640px** 居中；列表页最大宽度 **960px**。
- PWA 独立模式下 TopBar 顶部使用 `env(safe-area-inset-top)`，适配刘海屏。

### 3.3 页面层级与导航规则

| 层级 | 页面 | TopBar | BottomNav | 主操作位置 |
|---|---|---|---|---|
| 一级（Tab 页） | Home、Services、Schedule、Profile | 大标题，无返回 | 显示 | 页面内 |
| 二级（列表页） | Office Hour List、Find Space、Lost & Found List、My Bookings、Notifications、My Posts | 标题 + 返回 | 显示，高亮所属 Tab | 页面内 / 右上角 |
| 三级（详情 / 表单） | Teacher Detail、Space Detail、Booking Detail、Post Detail、Create Post、Course Editor | 标题 + 返回 | **隐藏** | **底部固定操作栏** |
| 角色页面 | Teacher Dashboard、Admin Dashboard | 标题 + 返回 + 角色标识 | 隐藏，桌面端使用侧边导航 | 页面内 |
| 认证页面 | Login、Register | 无 | 隐藏 | 页面内 |

**Tab 归属**（用于高亮 BottomNav）：

| Tab | 包含路由 |
|---|---|
| Home | `/home`、`/notifications` |
| Services | `/services`、`/office-hours/*`、`/spaces/*`、`/lost-found/*` |
| Schedule | `/schedule`、`/courses/*` |
| Profile | `/profile`、`/bookings/*`、`/my/posts` |

- 返回按钮优先使用浏览器历史返回；没有历史时（如从通知直接打开）返回所属 Tab 首页。
- 教师和管理员入口放在 Profile 页的“Role tools”区块中，仅对应角色可见。

---

## 4. 公共组件规范

组件位于 `src/components/ui/`，由 Member 1 维护。各模块**必须优先使用**这些组件。
组件 API 以 `feat/design-system` PR 中的实现为准，此处定义视觉与行为要求。

### 4.1 Button

| 变体 `variant` | 样式 | 用途 |
|---|---|---|
| `primary` | 主色实心，白字 | 页面主操作，每屏最多一个 |
| `secondary` | 白底，`border-strong` 边框，正文色文字 | 次要操作 |
| `ghost` | 无背景，主色文字 | 低强调操作、卡片内链接式操作 |
| `danger` | `danger-solid` 实心，白字 | 不可逆操作（取消预约、删除），仅在确认弹窗中使用 |

| 尺寸 `size` | 高度 | 字号 | 用途 |
|---|---|---|---|
| `sm` | 36px | 14px | 卡片内、筛选栏 |
| `md`（默认） | 44px | 16px | 常规 |
| `lg` | 52px | 16px | 底部固定操作栏、登录页 |

**状态**：default / hover / active（`scale-[0.98]`）/ focus-visible（2px `focus-ring` 外环，2px 间距）/ disabled（50% 不透明度，`cursor-not-allowed`）/ **loading**（显示 Spinner，文字保留，按钮禁用，防止重复提交）。

- 文案使用动词开头：`Book slot`、`Cancel booking`、`Submit claim`，不使用 `OK`、`Submit` 等含义不明确的词。
- `fullWidth` 用于手机端底部操作栏和表单提交。

### 4.2 IconButton

- 最小点击区域 **44 × 44px**（图标 20 / 24px）。
- 必须有 `aria-label`。

### 4.3 表单组件：Input / Textarea / Select / FormField

- 高度 44px，`rounded-sm`，1px `border-strong` 边框，字号 16px。
- 每个字段包含：**Label**（必填，位于输入框上方，不使用 placeholder 代替 label）、可选 **Hint**、**Error**。
- 必填字段在 Label 后显示 `*`，并在表单顶部说明“* Required”。
- 错误状态：边框变为 `danger`，下方显示错误图标 + 错误文字，并设置 `aria-invalid` 和 `aria-describedby`（错误不只依赖颜色，PRD 11.2）。
- 日期和时间使用原生 `<input type="date">`、`<input type="time" step="1800">`（30 分钟粒度），保证手机端体验和可访问性。

### 4.4 Card / ListItem

- `surface` 背景，1px `border`，`rounded-md`，`shadow-card`，内边距 16px。
- 可点击的卡片整体可点击，hover 时边框变为 `border-strong`，并有 focus-visible 样式；卡片内部不再嵌套其他可点击区域（除明确的次要按钮外）。
- 列表项结构：左侧图标 / 缩略图（40px）→ 中间标题 + 次要信息（最多两行，超出省略）→ 右侧状态标签或 `ChevronRight`。

### 4.5 Badge / StatusBadge / Chip

- **StatusBadge**：高度 24px，`rounded-full`，`text-caption`，浅色背景 + 语义文字色，映射见 2.2。
- **TypeTag**：事件类型或帖子类型标签，带图标，映射见 2.1。
- **Chip**（筛选）：高度 36px，未选中为 `secondary` 样式，选中为 `primary-subtle` 背景 + `primary` 文字 + `Check` 图标；多个 Chip 横向滚动，不换行。

### 4.6 Modal / BottomSheet / ConfirmDialog

- 手机端（< 768px）以 **BottomSheet** 形式从底部弹出；平板及以上以居中 **Modal** 展示（最大宽度 480px）。
- 遮罩 `rgb(15 23 42 / 0.5)`；点击遮罩、按 `Esc` 可关闭（ConfirmDialog 处理中时除外）。
- 打开时锁定背景滚动，焦点移入弹窗并限制在弹窗内，关闭后焦点返回触发元素。
- **ConfirmDialog** 用于所有取消、删除操作（PRD 4.3）：

```
┌──────────────────────────────┐
│ Cancel this booking?         │  ← 标题：以问句说明操作
│                              │
│ Study Room B-2, Mon 3 Nov,   │  ← 正文：说明操作对象与后果
│ 14:00–16:00. The seat will   │
│ be released to others.       │
│                              │
│ [ Keep booking ] [ Cancel booking ] │ ← 次要按钮在左，危险按钮在右
└──────────────────────────────┘
```

### 4.7 Toast

- 用于操作结果的短暂反馈，从顶部（手机）或右下角（桌面）出现，4 秒后自动消失，可手动关闭。
- 类型：`success` / `error` / `info`，带对应图标。
- 使用 `role="status"`（success/info）或 `role="alert"`（error）。
- **重要结果（预约成功）不只用 Toast**：预约成功后跳转到详情页或显示结果页，Toast 只作为辅助。

### 4.8 Loading：Spinner / Skeleton

- **页面首次加载**使用 **Skeleton**，形状与真实内容一致，避免布局跳动。
- **按钮提交**使用按钮内 Spinner。
- 超过 10 秒未返回时显示 Error State，不得出现无限加载（PWA-AC-03）。

### 4.9 EmptyState

```
        [48px 图标]
      No bookings yet           ← 标题：说明当前状态
 Book an office hour or a study  ← 说明：告诉用户可以做什么
    seat to see it here.
      [ Find a space ]          ← 可选：引导操作
```

- 区分“没有数据”和“筛选后无结果”：后者提供 `Clear filters` 操作。

### 4.10 ErrorState

- 图标 + 简短错误说明 + `Try again` 按钮。
- 文案不暴露技术细节（不显示堆栈、SQL 错误等）。
- 区分：网络断开（显示离线文案）、无权限（403）、资源不存在（404）、服务器错误（500）。

### 4.11 TopBar

- 高度 56px，`surface` 背景，底部 1px `border`。
- 结构：左侧返回按钮（如有）→ 标题（单行省略）→ 右侧最多两个操作图标。
- 一级页面使用左对齐大标题（`text-title-lg`）；其他页面标题居中（`text-title`）。

### 4.12 BottomNav / SideNav

- 4 个 Tab：Home（`House`）、Services（`LayoutGrid`）、Schedule（`CalendarDays`）、Profile（`UserRound`）。
- 图标 24px + 文字 12px，选中项使用 `primary` 色和实心样式，并设置 `aria-current="page"`。
- 未读通知数量以小红点或数字徽章显示在 Home 图标上（最多显示 `99+`）。
- 桌面端转换为 240px 左侧 SideNav，结构相同；教师 / 管理员入口显示在 SideNav 底部。

### 4.13 StickyActionBar（底部固定操作栏）

- 三级页面（详情、表单）的主操作固定在底部：`surface` 背景，顶部 1px `border`，内边距 16px + 安全区。
- 可放一行摘要信息（如 “Mon 3 Nov · 14:00–16:00”）+ 一个 `lg` 主按钮。

### 4.14 DemoDataNotice（演示数据声明）

满足 SP-AC-07 及 PRD 2.3 的要求：

- **全局**：Login 页底部和 Profile 页底部显示 “CAMPUS HELPER is an academic project. Bookings are not recorded in any official university system.”
- **页面级**：Office Hour List、Find Space、Space Detail、Teacher Detail 顶部显示 `info` 样式的提示条：“Demo data — not official real-time availability.”
- 提示条可收起，但每次进入页面重新显示。

### 4.15 OfflineBanner

- 检测到断网时在 TopBar 下方显示 `warning` 样式横幅：“You’re offline. Bookings and posts are unavailable until you reconnect.”
- 断网期间所有提交类按钮禁用，并在按钮下方说明原因（PWA-AC-04）。
- 恢复联网后横幅变为 `success` 样式 “Back online” 并在 3 秒后消失。

### 4.16 TimeSlotButton（时段选择）

Office Hour 时段和 Study Space 时段选择使用相同的视觉：

| 状态 | 样式 |
|---|---|
| 可选 | `secondary` 按钮样式，显示 `14:00–14:30` |
| 已选 | `primary` 实心 + `Check` 图标 |
| 不可用 | `surface-muted` 背景 + `text-disabled` + 删除线，`aria-disabled`，并显示原因（Booked / Past） |

---

## 5. 交互状态规范

每个数据驱动的页面或区块**必须**实现以下状态（PRD 4.3）：

| 状态 | 表现 | 组件 |
|---|---|---|
| Loading | Skeleton；提交时按钮 Loading | Skeleton、Button |
| Empty | 说明 + 引导操作 | EmptyState |
| Error | 原因 + 重试 | ErrorState |
| Success | 结果页 / 详情页 / Toast | Toast |
| Offline | 横幅 + 禁用提交 | OfflineBanner |
| Disabled | 禁用样式 + **说明原因** | Button、TimeSlotButton |

**关键规则**：

1. **不使用乐观更新显示预约成功**。预约、认领、取消必须等待服务端确认后再更新界面。
2. 提交过程中按钮进入 Loading 并禁用，防止重复提交。
3. 服务端返回冲突（`409`）时，保留用户已填写的内容，显示具体原因，并引导重新选择（如 “This seat was just booked. Please choose another seat.”）。
4. 不允许点击后毫无反馈的按钮：不可操作时禁用并说明原因。
5. 取消、删除使用 ConfirmDialog，按钮文案写明具体操作。

---

## 6. 表单规范

- **校验时机**：字段失去焦点时校验该字段；提交时校验全部字段，并将焦点移到第一个错误字段。
- 服务端返回的字段错误（`VALIDATION_ERROR.fields`）显示在对应字段下方。
- 字段顺序与用户思考顺序一致（如课程表单：Course Code → Name → Weekday → Time → Weeks → Reminder）。
- 长表单按区块分组，每组有小标题。
- 有未保存内容时离开页面，弹出确认（Course Editor、Create Post）。
- 所有表单可完全通过键盘完成：`Tab` 顺序正确，`Enter` 提交。

---

## 7. 文案与格式

### 7.1 语言与语气

- 界面语言 **英文优先**（PRD 17），中文支持为 P1。代码中的界面文案集中写在各模块的常量中，方便后续国际化。
- 语气简洁、友好、具体。使用 “you”，避免 “user”。
- 错误信息说明 **发生了什么 + 怎么解决**，不责怪用户：
  - ✅ “This slot has already started. Choose a later time.”
  - ❌ “Invalid input.” / “Error 409.”
- 标题和按钮使用 **Sentence case**：`Book a study space`，而不是 `Book A Study Space`。

### 7.2 日期与时间

所有时间按 **`Asia/Shanghai`** 展示，统一使用 `src/lib/time.ts` 中的格式化函数，不在组件中自行格式化。

| 场景 | 格式 | 示例 |
|---|---|---|
| 日期 | `EEE d MMM` | Mon 3 Nov |
| 带年份日期 | `d MMM yyyy` | 3 Nov 2026 |
| 时间 | 24 小时制 `HH:mm` | 14:00 |
| 时间段 | `HH:mm–HH:mm`（en dash） | 14:00–16:00 |
| 完整 | `EEE d MMM, HH:mm–HH:mm` | Mon 3 Nov, 14:00–16:00 |
| 相对时间 | 今天 / 明天使用 Today / Tomorrow | Today, 14:00 |
| 通知时间戳 | 1 小时内用相对时间 | 5 min ago |
| 教学周 | `Week n` | Week 7 |

### 7.3 隐私

- 不在公开页面显示完整学号、电话、身份证号（PRD 7.5）。用户在列表中显示为名字 + 姓氏首字母，例如 “Alex C.”。
- 私密认领说明只在发布者和管理员的视图中渲染，并用 `Lock` 图标标注 “Only visible to you and admins”。

---

## 8. 可访问性清单

- [ ] 文字对比度 ≥ 4.5:1，大号文字和图标 ≥ 3:1
- [ ] 所有可交互元素点击区域 ≥ 44 × 44px
- [ ] 所有可交互元素有可见的 `focus-visible` 焦点环
- [ ] 图标按钮有 `aria-label`；装饰性图标 `aria-hidden`
- [ ] 表单控件有关联的 `<label>`
- [ ] 错误、状态不只依赖颜色区分（配合图标和文字）
- [ ] 页面有唯一的 `<h1>`，标题层级正确
- [ ] 使用语义化标签：`<nav>`、`<main>`、`<button>`、`<a>`，不用 `<div onClick>`
- [ ] 弹窗焦点管理正确，`Esc` 可关闭
- [ ] 支持系统字体放大到 200% 时内容不被截断
- [ ] 尊重 `prefers-reduced-motion`

---

## 9. Member 1 负责页面的框架

### PG-02 Home `/home`

```
┌──────────────────────────────┐
│ Good morning, Alex       🔔• │  ← text-display + 通知图标（未读徽章）
│ Tue 28 Oct                   │
├──────────────────────────────┤
│ NEXT CLASS                   │
│ ┌──────────────────────────┐ │
│ │ 📘 CPT203 Software Eng.   │ │  ← event-class 色条 + 图标
│ │ 14:00–15:50 · SD 302      │ │
│ │ Starts in 35 min          │ │
│ └──────────────────────────┘ │
│ QUICK ACCESS                 │
│ [Office ][Space ][Class ][L&F]│  ← 4 宫格，同 Services 入口
│ UPCOMING BOOKINGS   See all ›│
│ ┌ 👤 Dr. Chen · Wed 14:00 ─┐ │  ← 最多 3 条，按时间排序
│ ┌ 🪑 Seat B-12 · Thu 10:00 ┐ │
│ RECENT NOTIFICATIONS See all›│
│ • Booking confirmed …  5m ago│  ← 最多 3 条
├──────────────────────────────┤
│ Home  Services Schedule Profile│
└──────────────────────────────┘
```

- 每个区块独立 Loading / Empty（HOME-AC-02），一个区块失败不影响其他区块。
- 无课程时 “Next class” 显示 “No upcoming classes. Add your timetable →”。
- 数据来源：Next class 与 Upcoming bookings 使用 Member 4 提供的统一日程接口；Notifications 使用 Member 4 的通知接口。

### PG-03 Services `/services`

```
┌──────────────────────────────┐
│ Services                     │
├──────────────────────────────┤
│ ┌────────────┐ ┌────────────┐│
│ │ 👤          │ │ 🪑          ││  ← 2 列卡片（桌面 4 列）
│ │ Office Hour │ │ Study Space ││
│ │ Book time   │ │ Reserve a   ││
│ │ with staff  │ │ seat        ││
│ └────────────┘ └────────────┘│
│ ┌────────────┐ ┌────────────┐│
│ │ 📘 Class    │ │ 🔍 Lost &   ││
│ │ Reminder    │ │ Found       ││
│ └────────────┘ └────────────┘│
│ ⓘ Demo data — academic project│  ← DemoDataNotice
└──────────────────────────────┘
```

### PG-18 Profile `/profile`

```
┌──────────────────────────────┐
│ Profile                      │
├──────────────────────────────┤
│ (A)  Alex Chen               │
│      alex.c@demo.campus · Student │ ← 角色徽章
├──────────────────────────────┤
│ My bookings               ›  │
│ My posts                  ›  │
│ Notification settings     ›  │
├──────────────────────────────┤
│ ROLE TOOLS（仅教师/管理员）    │
│ Teacher dashboard         ›  │
│ Admin dashboard           ›  │
├──────────────────────────────┤
│ Install app               ›  │  ← 支持安装时显示
│ [ Log out ]                  │  ← secondary，需确认
│ CAMPUS HELPER is an academic │
│ project …                    │
└──────────────────────────────┘
```

- **通知设置**：浏览器通知权限只在用户点击 “Enable push notifications” 后申请（FR-PWA-03）；权限被拒绝时说明如何在浏览器中重新开启，并提示站内通知和日历导出仍可使用。

### 通用页面模板

其他成员的页面按以下三种模板搭建：

| 模板 | 结构 | 适用页面 |
|---|---|---|
| **List** | TopBar → 搜索框（可选）→ 筛选 Chip 行 → 结果数量 → 卡片列表 → 分页 / 加载更多 | PG-04、PG-06、PG-08、PG-13、PG-14、PG-17 |
| **Detail** | TopBar → 主信息卡（标题、状态、类型标签）→ 信息分组（时间、地点、说明）→ StickyActionBar | PG-05、PG-09、PG-10、PG-16 |
| **Form** | TopBar → 分组字段 → StickyActionBar（提交） | PG-12、PG-15 |

---

## 10. 设计一致性检查（PR Review 用）

Member 1 在合并前按此清单检查 UI：

- [ ] 只使用语义化颜色 Token，无原始色板类名和硬编码色值
- [ ] 使用公共组件（Button、Card、StatusBadge 等），无重复造轮子
- [ ] 状态颜色符合 2.2 映射表
- [ ] 间距、圆角、字号符合 Token
- [ ] 页面层级符合 3.3（TopBar、BottomNav、StickyActionBar）
- [ ] Loading / Empty / Error 状态完整
- [ ] 日期时间格式使用统一函数
- [ ] 375px 下无横向滚动，底部导航不遮挡按钮
- [ ] 键盘可完整操作，焦点可见
- [ ] 需要演示数据声明的页面已显示 DemoDataNotice

---

## 11. Figma 组织方式

| Figma Page | 内容 |
|---|---|
| `00 Cover` | 项目名、版本、更新日期 |
| `01 Foundations` | 颜色、字体、间距、圆角、阴影、图标，名称与本文档 Token 一致 |
| `02 Components` | 第 4 节全部组件及其状态变体 |
| `03 Flows` | Flow 01–04 用户流程图 |
| `04 Mobile 375` | 所有页面，Frame 命名 `PG-xx Page Name / State`，如 `PG-08 Find Space / Empty` |
| `05 Tablet & Desktop` | 关键页面的 768px 与 1280px 版本 |
| `99 Archive` | 废弃方案 |

- 每个页面至少包含 Default、Loading、Empty、Error 四个状态 Frame。
- Figma 更新后在对应 Issue 或 PR 中附上 Frame 链接。

---

## 12. 变更记录

| 版本 | 日期 | 修改内容 | 作者 |
|---|---|---|---|
| V1.0 Draft | 2026-10-28 | 初稿：Token、布局、组件、状态、文案、核心页面框架 | Member 1 |
