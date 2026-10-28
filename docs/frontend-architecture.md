# CAMPUS HELPER — Frontend Architecture

| 项目     | 内容                                                                       |
| -------- | -------------------------------------------------------------------------- |
| 文档编号 | 04 — Frontend Architecture（PRD 第 18 节）                                 |
| 版本     | V1.0 Draft                                                                 |
| 负责人   | Member 1（Ran An）                                                         |
| 关联文档 | [UI/UX 设计规范](design/ui-ux-spec.md)、[协作开发规范](../CONTRIBUTING.md) |

本文档规定 Next.js 项目的目录结构、路由、组件分层和数据获取方式，确保 5 名成员在各自目录内并行开发、互不冲突。
标注“提案”的内容需要相关负责人在对应 PR 中确认后生效。

---

## 1. 技术选型

| 部分     | 选型                                                              | 说明                                              |
| -------- | ----------------------------------------------------------------- | ------------------------------------------------- |
| 框架     | Next.js App Router + React                                        | 具体版本以 `chore/project-setup` 锁定的为准       |
| 语言     | TypeScript（strict）                                              |                                                   |
| 样式     | Tailwind CSS                                                      | Token 定义在 `src/app/globals.css` 的 `@theme` 中 |
| 图标     | lucide-react                                                      |                                                   |
| 类名合并 | `clsx` + `tailwind-merge`，封装为 `cn()`                          | `src/lib/utils.ts`                                |
| 校验     | zod                                                               | 前后端共用 schema                                 |
| 表单     | react-hook-form + zod resolver                                    | 提案：全组统一，避免各模块写法不同                |
| 时间     | `Intl.DateTimeFormat`（无额外依赖），统一封装在 `src/lib/time.ts` | 周次等复杂计算如需 date-fns，由 Member 4 引入     |
| 数据库   | PostgreSQL + Prisma                                               | Member 2 负责                                     |
| 认证     | Auth.js 或等效方案                                                | Member 2 在 `feat/auth-and-roles` 中确定          |
| 测试     | Vitest、Playwright                                                |                                                   |

新增依赖须在 PR 中说明原因（见协作规范第 4 节）。

---

## 2. 目录结构

```
campus-helper/
├── prisma/
│   ├── schema.prisma            # Member 2
│   ├── migrations/
│   └── seed.ts                  # 调用各模块的 seed 函数
├── public/
│   ├── icons/                   # PWA 图标（Member 1）
│   └── images/
├── src/
│   ├── app/                     # 路由层：只做页面组装、鉴权和数据获取调用
│   │   ├── layout.tsx           # 根布局：字体、元数据、Toast 容器（Member 1）
│   │   ├── globals.css          # Design Tokens（Member 1）
│   │   ├── manifest.ts          # PWA Manifest（Member 1）
│   │   ├── offline/page.tsx     # 离线页面（Member 1）
│   │   ├── (auth)/              # 无导航布局
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (main)/              # 带 BottomNav / SideNav 的学生主布局
│   │   │   ├── layout.tsx       # App Shell（Member 1）
│   │   │   ├── home/
│   │   │   ├── services/
│   │   │   ├── schedule/
│   │   │   ├── profile/
│   │   │   ├── office-hours/
│   │   │   ├── spaces/
│   │   │   ├── bookings/
│   │   │   ├── courses/
│   │   │   ├── notifications/
│   │   │   ├── lost-found/
│   │   │   └── my/posts/
│   │   ├── teacher/             # 教师布局，服务端校验 TEACHER 角色
│   │   │   ├── layout.tsx
│   │   │   └── office-hours/
│   │   ├── admin/               # 管理员布局，服务端校验 ADMIN 角色
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   └── api/                 # Route Handlers，按资源划分
│   │       ├── office-slots/
│   │       ├── office-bookings/
│   │       ├── space-bookings/
│   │       ├── courses/
│   │       ├── notifications/
│   │       ├── lost-found/
│   │       └── admin/
│   ├── components/
│   │   ├── ui/                  # 公共基础组件（Member 1）
│   │   └── layout/              # TopBar、BottomNav、SideNav、AppShell（Member 1）
│   ├── features/                # 业务模块，每个模块自包含
│   │   ├── office-hours/        # Member 2
│   │   ├── spaces/              # Member 3
│   │   ├── bookings/            # Member 3
│   │   ├── courses/             # Member 4
│   │   ├── schedule/            # Member 4（统一日程）
│   │   ├── notifications/       # Member 4
│   │   ├── lost-found/          # Member 5
│   │   └── admin/               # Member 5
│   ├── lib/                     # 跨模块基础设施
│   │   ├── auth/                # 会话、角色检查（Member 2）
│   │   ├── db.ts                # Prisma Client 单例（Member 2）
│   │   ├── api.ts               # 统一响应 / 错误工具（提案：Member 1 + Member 2）
│   │   ├── time.ts              # 时区与格式化（Member 1 提供格式化，Member 4 补充周次计算）
│   │   └── utils.ts             # cn() 等通用函数
│   └── types/                   # 全局共享类型
└── tests/
    └── e2e/                     # Playwright 端到端测试
```

---

## 3. 路由表

PG 编号与 PRD 4.2 页面清单对应。路由组 `(auth)`、`(main)` 不出现在 URL 中。

| PG    | 页面              | 路由文件                                         | URL                     | 负责人 |
| ----- | ----------------- | ------------------------------------------------ | ----------------------- | ------ |
| PG-01 | Login / Register  | `(auth)/login`、`(auth)/register`                | `/login`、`/register`   | M2     |
| PG-02 | Home              | `(main)/home`                                    | `/home`                 | M1     |
| PG-03 | Services          | `(main)/services`                                | `/services`             | M1     |
| PG-04 | Office Hour List  | `(main)/office-hours`                            | `/office-hours`         | M2     |
| PG-05 | Teacher Detail    | `(main)/office-hours/[id]`                       | `/office-hours/[id]`    | M2     |
| PG-06 | My Bookings       | `(main)/bookings`                                | `/bookings`             | M3     |
| PG-07 | Teacher Dashboard | `teacher/office-hours`                           | `/teacher/office-hours` | M2     |
| PG-08 | Find Space        | `(main)/spaces`                                  | `/spaces`               | M3     |
| PG-09 | Space Detail      | `(main)/spaces/[id]`                             | `/spaces/[id]`          | M3     |
| PG-10 | Booking Detail    | `(main)/bookings/[id]`                           | `/bookings/[id]`        | M3     |
| PG-11 | Schedule          | `(main)/schedule`                                | `/schedule`             | M4     |
| PG-12 | Course Editor     | `(main)/courses/new`、`(main)/courses/[id]/edit` | 同左                    | M4     |
| PG-13 | Notifications     | `(main)/notifications`                           | `/notifications`        | M4     |
| PG-14 | Lost & Found List | `(main)/lost-found`                              | `/lost-found`           | M5     |
| PG-15 | Create Post       | `(main)/lost-found/new`                          | `/lost-found/new`       | M5     |
| PG-16 | Post Detail       | `(main)/lost-found/[id]`                         | `/lost-found/[id]`      | M5     |
| PG-17 | My Posts          | `(main)/my/posts`                                | `/my/posts`             | M5     |
| PG-18 | Profile           | `(main)/profile`                                 | `/profile`              | M1     |
| PG-19 | Admin Dashboard   | `admin`                                          | `/admin`                | M5     |

- `/` 重定向：已登录 → `/home`，未登录 → `/login`。
- 未登录访问受保护页面时跳转 `/login?next=<原路径>`，登录后返回原页面（AUTH-AC-03）。
- 页面级 TopBar 是否显示返回按钮、是否隐藏 BottomNav，遵循设计规范 3.3。三级页面通过各自的 `layout.tsx` 或页面参数隐藏 BottomNav，具体 API 在 `feat/app-layout` 中提供。
- **Booking Detail（`/bookings/[id]`）** 需要同时支持 Office Hour 与 Study Space 预约。提案：URL 使用 `/bookings/office-[id]`、`/bookings/space-[id]` 区分类型，由 Member 3 在 `feat/unified-bookings` 中确认。

---

## 4. 分层与依赖规则

```
app/（路由层）
   │  只能调用 ↓
features/<module>/（业务层）
   │  只能调用 ↓
components/ui/、components/layout/、lib/（基础层）
```

| 规则           | 说明                                                                                                                                                                                     |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 单向依赖       | 基础层不得引用 `features/`；`components/ui/` 不得包含任何业务逻辑或数据请求                                                                                                              |
| 模块公开接口   | 每个模块有两个公开入口：`features/<module>/index.ts`（组件、类型、客户端安全的函数）和 `features/<module>/server/index.ts`（服务端查询与操作）                                           |
| 禁止深层引用   | 模块外只能 `import ... from "@/features/spaces"` 或 `"@/features/spaces/server"`，不能引用 `@/features/spaces/server/queries` 等内部文件。ESLint 规则 `no-restricted-imports` 会自动检查 |
| 服务端代码隔离 | `server/` 目录下的文件顶部加 `import "server-only"`，防止被打包进客户端                                                                                                                  |

### 4.1 业务模块内部结构

```
src/features/spaces/
├── index.ts            # 公开接口（客户端安全的部分）
├── components/         # 模块专用组件，如 seat-card.tsx、space-filter-bar.tsx
├── server/             # 数据库查询、业务规则（server-only）
│   ├── index.ts        # 服务端公开接口，供页面和其他模块的服务端代码调用
│   ├── queries.ts      # 读取
│   ├── mutations.ts    # 写入，包含事务
│   └── rules.ts        # 纯函数业务规则，便于单元测试
├── schemas.ts          # zod schema（前后端共用）
├── types.ts            # 模块类型
├── constants.ts        # 规则常量、界面文案
└── __tests__/
```

---

## 5. 服务端与客户端组件

- **默认使用 Server Component**。只有需要状态、事件处理、浏览器 API 的叶子组件才加 `"use client"`。
- `"use client"` 边界尽量下移：页面是服务端组件，只把筛选栏、表单、按钮等交互部分做成客户端组件。
- 服务端组件中可以直接调用 `@/features/<module>/server` 读取数据，不需要经过 API。
- 敏感数据（私密认领说明、其他用户的联系方式）只在服务端完成权限过滤后再传给客户端组件；不得先传全量数据再在客户端隐藏。

---

### 5.1 Next.js 16 注意事项

本项目使用 Next.js 16，部分约定与网上较早的教程不同。遇到疑问时以 `node_modules/next/dist/docs/` 中随版本附带的文档为准。

| 主题                | 本项目约定                                                                                                                                                                          |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 构建工具            | 开发和构建默认使用 Turbopack，不添加自定义 `webpack` 配置                                                                                                                           |
| 请求拦截            | 使用 `src/proxy.ts`（原 `middleware.ts` 已更名为 Proxy），供 Member 2 实现登录跳转。Proxy 只做快速跳转判断，**权限必须在页面、查询函数和接口中再次检查**                            |
| 异步请求 API        | `params`、`searchParams`、`cookies()`、`headers()` 均为异步，需要 `await`                                                                                                           |
| Cache Components    | 已在 `next.config.ts` 中开启（`cacheComponents: true`）。读取 cookies、会话或数据库实时数据的组件需包在 `<Suspense>` 中，并提供 Skeleton 作为 fallback                              |
| `"use cache"`       | **禁止**用于任何与当前用户相关的数据（预约、课程、通知、认领）。只有演示空间列表、教师公开资料等公共数据可以考虑缓存，并须配合 `cacheLife`                                          |
| 当前时间            | 预渲染阶段不能读取 `new Date()` / `Date.now()`，否则构建失败。依赖当前时间的内容（“Today”、“5 min ago”、即将到来的课程）放在请求时渲染的组件中（`<Suspense>` 内），或显式传入 `now` |
| `GET` Route Handler | 开启 Cache Components 后，`GET` 处理器默认按页面方式预渲染；返回用户数据的接口必须读取会话等请求数据，确保按请求执行                                                                |

## 6. 数据获取与修改

| 场景                               | 方式                                                                                                                           |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 页面初始数据                       | Server Component 直接调用 `@/features/<module>/server` 导出的查询函数，权限在查询函数内检查                                    |
| 用户提交（预约、取消、发布、认领） | 客户端组件调用 `src/app/api/` 下的 Route Handler（`fetch`）                                                                    |
| 提交成功后刷新                     | `router.refresh()` 刷新服务端数据，或 `router.push()` 跳转到结果页                                                             |
| 筛选、搜索、分页                   | 状态写入 **URL Search Params**（如 `/spaces?date=2026-11-03&start=14:00&floor=2`），服务端根据参数查询；页面可分享、刷新不丢失 |

提案理由：使用 Route Handler 处理写操作，可以与 PRD 要求的 API Specification（03）一一对应，并便于集成测试；最终方案由 Member 2 在 `feat/database-foundation` 中确认。

### 6.1 状态管理

- **不引入全局状态库**。
- 服务端数据：Server Component + `router.refresh()`。
- 筛选条件：URL Search Params。
- 跨页面的少量客户端状态（当前用户会话、Toast、在线状态）：使用 React Context，由 Member 1 / Member 2 在根布局中提供。

---

## 7. 跨模块共享接口

以下接口被多个模块使用，需要尽早确定。类型定义放在提供方模块的 `index.ts` 中导出。

### 7.1 统一日程事件（提供方：Member 4）

Home、Schedule、My Bookings 均使用此类型（PRD 8.1）：

```ts
// 提案，由 Member 4 在 feat/unified-calendar 中确认
export type ScheduleEventType = "CLASS" | "OFFICE_HOUR" | "STUDY_SPACE";

export interface ScheduleEvent {
  id: string; // `${type}:${sourceId}`，保证唯一
  type: ScheduleEventType;
  sourceId: string; // 来源记录 ID
  title: string;
  startsAt: string; // ISO 8601（UTC）
  endsAt: string;
  location: string | null;
  status: string; // 来源业务状态，用于 StatusBadge
  href: string; // 点击后进入的详情页
}
```

- Member 2 和 Member 3 各自提供“把本模块预约转换为 `ScheduleEvent`”的服务端函数，Member 4 负责汇总和排序。

### 7.2 通知（提供方：Member 4）

```ts
// 提案，由 Member 4 在 feat/notification-service 中确认
createNotification({
  userId,
  type, // 对应 PRD 8.2 通知类型
  title,
  body,
  href, // 点击跳转目标
  dedupeKey, // 去重键，防止重复通知（NT-AC-03）
});
```

- 其他模块在业务事务提交成功后调用，不自行写通知表。

### 7.3 会话与权限（提供方：Member 2）

页面和接口统一使用 `src/lib/auth/` 提供的函数，例如 `getCurrentUser()`、`requireUser()`、`requireRole("ADMIN")`。具体命名以 `feat/auth-and-roles` 为准。

---

## 8. PWA 与缓存边界（Member 1）

| 资源                            | 缓存策略                        |
| ------------------------------- | ------------------------------- |
| 静态资源（JS、CSS、字体、图标） | 缓存优先                        |
| `/offline` 页面                 | 安装 Service Worker 时预缓存    |
| 页面导航请求                    | 网络优先，断网时返回 `/offline` |
| `/api/*` 和所有个人数据         | **不缓存**（FR-PWA-04）         |
| Lost & Found 上传图片           | 不缓存                          |

- 断网时不允许提交，界面行为见设计规范 4.15。
- Web Push 的订阅与发送由 Member 4 在 PWA 基础完成后集成，Service Worker 文件由 Member 1 维护，推送事件处理部分由 Member 4 提交 PR。

---

## 9. 开发顺序与依赖

```
W3  chore/project-setup (M1) ──┬─> feat/design-system (M1) ──> feat/app-layout (M1)
                               └─> feat/database-foundation (M2) ──> feat/auth-and-roles (M2)
                                                                       │
W4+ 各业务模块（M2–M5）在 design-system 与 auth 合并后开始页面开发 <───┘
W10 feat/pwa-foundation (M1)、feat/unified-calendar、feat/notification-service (M4)
```

- 在 `feat/design-system` 合并前，其他成员可以先开发 `server/` 中的业务规则和测试，不必等待 UI。
- 在 `feat/auth-and-roles` 合并前，可使用 Member 2 提供的临时 `getCurrentUser()` 桩函数。

---

## 10. 变更记录

| 版本       | 日期       | 修改内容                                                 | 作者     |
| ---------- | ---------- | -------------------------------------------------------- | -------- |
| V1.0 Draft | 2026-10-28 | 初稿：目录结构、路由表、分层规则、数据获取、共享接口提案 | Member 1 |
