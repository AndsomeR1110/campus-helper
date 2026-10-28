# AI 编码助手使用指南

本项目允许使用 Claude Code、Codex、Cursor 等 AI 编码助手。为了让每个人的 agent 都遵守同一套规范：

1. **通用规则已写在仓库里，agent 会自动读取。**
   - `AGENTS.md`：项目规则（分支、权限、UI、安全、Next.js 16、测试）。Codex、Cursor 等直接读取。
   - `CLAUDE.md`：引用 `AGENTS.md`，供 Claude Code 读取。
   - 这两个文件由 Member 1 维护，**不要在功能 PR 里修改**。需要补充规则时提 Issue。
2. **每个人只需要在开始任务时，给 agent 一段说明自己身份和任务的提示词**，即下文的模板。
3. 规则和提示词都不能代替人工检查：PR 仍需非作者 review，CI 必须通过。

> `AGENTS.md` 开头的 `nextjs-agent-rules` 区块由 `next dev` 自动维护，不要删除。项目规则写在该区块之后，`next dev` 不会覆盖。

---

## 使用方法

1. 拉取最新 `main`：`git switch main && git pull`。
2. 在 `docs/team-assignment.md` 中找到你本次要做的 PR（例如 `feat/space-availability`）。
3. 复制下文“通用开头”，再接上你自己的“成员说明”，把 `<本次任务>` 换成具体 PR 名称和要求，发给 agent。
4. 先让 agent 给出计划，确认后再写代码。
5. agent 完成后，自己在浏览器中按 PR 模板的测试步骤走一遍，并截取 375px 截图。

---

## 通用开头（所有人相同）

```text
你在 CAMPUS HELPER 项目中工作。开始前先阅读仓库根目录的 AGENTS.md，并按其中“Read before you start”列出的文档了解需求和规范，尤其是 docs/prd.md 中与本任务相关的 FR 和 AC 编号。

要求：
- 从最新 main 创建分支，分支名使用下面给出的名称；不要向 main 推送。
- 只修改我负责的模块目录；需要改动其他成员或公共文件时，先停下来告诉我。
- 页面只用 @/components/ui 中的组件和语义化 Token，日期时间只用 @/lib/time。
- 所有权限和业务规则在服务端检查，预约类操作使用数据库事务防止并发冲突。
- 业务规则写成纯函数并写 Vitest 测试，测试名标注 AC 编号。
- 完成后运行 npm run check 和 npm run build，全部通过再提交；提交信息使用 Conventional Commits（英文）。
- 按 .github/pull_request_template.md 写 PR 描述，列出覆盖的 PG 和 AC 编号及测试步骤。
- 先给出实现计划（涉及的文件、数据结构、接口、测试），等我确认后再开始写代码。
```

---

## 成员说明

### Member 1 — 项目负责人 / UI（Ran An）

```text
我是 Member 1（项目负责人、UI/UX）。我负责：src/components/ui/、src/components/layout/、src/app/layout.tsx、src/app/globals.css、src/lib/utils.ts、src/lib/time.ts、PWA（manifest、service worker、离线页面），以及 Home（PG-02）、Services（PG-03）、Profile（PG-18）页面框架。
修改公共组件时保持向后兼容；不兼容的改动要在 PR 中写明影响的模块。设计以 docs/design/ui-ux-spec.md 为准，修改规范需同步更新文档。

本次任务：<例如 feat/app-layout：实现 AppShell、TopBar、BottomNav、SideNav、StickyActionBar，以及 Home/Services/Profile 页面框架。数据部分先使用占位，等 Member 4 的统一日程接口完成后接入。>
```

### Member 2 — 认证与 Office Hour

```text
我是 Member 2（认证与 Office Hour）。我负责：prisma/（schema、migrations、seed 入口）、src/lib/auth/、src/lib/db.ts、src/proxy.ts、src/features/office-hours/，页面 PG-01、PG-04、PG-05、PG-07，以及对应的 src/app/api/ 接口。
实体：User、TeacherProfile、OfficeSlot、OfficeBooking。验收：AUTH-AC-01～05、OH-AC-01～08。
注意：
- 我是 Schema 的负责人。其他模块的实体由各自负责人设计，我负责审核并保持命名一致；枚举值需与 src/components/ui/status-badge.tsx 的 STATUS_MAP 对应。
- CONTRIBUTING §6 的 API 响应格式和 docs/frontend-architecture.md §7.3 的 getCurrentUser()/requireUser()/requireRole() 由我最终确定，确定后更新文档。
- 认证方案需兼容 Next.js 16 的 proxy.ts 和 Cache Components（阅读 node_modules/next/dist/docs/01-app/02-guides/authentication-with-cache-components.md）。
- 时段预约必须防止超额和重复预约（OH-AC-03、OH-AC-04），使用数据库约束或事务锁实现，并写并发测试。
- 需提供把 Office Hour 预约转换为 ScheduleEvent 的服务端函数，供 Member 4 汇总。

本次任务：<例如 feat/database-foundation：建立 Prisma + PostgreSQL、User/TeacherProfile 模型、迁移、种子数据入口和 src/lib/db.ts。>
```

### Member 3 — 学习空间与统一预约

```text
我是 Member 3（Study Space 与 My Bookings）。我负责：src/features/spaces/、src/features/bookings/，页面 PG-06、PG-08、PG-09、PG-10，以及对应的 src/app/api/ 接口。
实体：Space、SpaceBooking（Schema 改动需 Member 2 review）。验收：SP-AC-01～08。
注意：
- 可用性必须根据所选时间段和已有预约实时计算，不能用静态 available 字段（FR-SP-03）。
- 演示规则：30 分钟粒度、单次 30–180 分钟、未来 7 天内、同一学生重叠时间最多一个有效预约，全部由服务端校验（SP-AC-05）。
- 同一座位重叠时间只能成功一个预约（SP-AC-04），使用数据库约束或事务锁实现，并写并发测试。
- 筛选条件存放在 URL search params 中；座位和时段选择使用 Chip、TimeSlotButton；页面顶部显示 DemoDataNotice。
- My Bookings 汇总 Office Hour 与座位预约，Office Hour 数据通过 @/features/office-hours/server 获取，不直接查询其表。
- 需提供把座位预约转换为 ScheduleEvent 的服务端函数，供 Member 4 汇总。

本次任务：<例如 feat/space-list-and-filter：空间演示数据、列表与楼宇/楼层/类型筛选。>
```

### Member 4 — 课程、日程与通知

```text
我是 Member 4（Class Reminder、统一日程、通知）。我负责：src/features/courses/、src/features/schedule/、src/features/notifications/，页面 PG-11、PG-12、PG-13，以及对应的 src/app/api/ 接口和提醒定时任务。
实体：Course、CourseOccurrence、ReminderRule、Notification（Schema 改动需 Member 2 review）。验收：CR-AC-01～08、NT-AC-01～04。
注意：
- 我负责 ScheduleEvent 类型和 createNotification() 接口（docs/frontend-architecture.md §7.1、§7.2），确定后更新文档，并通知其他成员。
- 课程时间按 Asia/Shanghai 处理，存储为 UTC；提醒要考虑教学周范围；修改或删除课程后旧提醒不得触发。
- 提醒任务可重复执行但不能产生重复通知（CR-AC-06、NT-AC-03），用 dedupeKey + 数据库唯一约束实现。
- 依赖当前时间的显示（“Today”、“5 min ago”、下一节课）必须在 <Suspense> 内渲染，或显式传入 now，否则构建失败。
- .ics 导出需包含正确时区（VTIMEZONE 或 UTC 时间），并在至少一个日历应用中验证（CR-AC-08）。
- Web Push 在 Member 1 完成 PWA 基础后再接入；Service Worker 文件由 Member 1 维护，推送处理通过 PR 提交给 Member 1 审核。

本次任务：<例如 feat/course-management：课程增删改、表单校验（结束时间晚于开始时间）、教学周。>
```

### Member 5 — Lost & Found 与管理后台

```text
我是 Member 5（Lost & Found 与 Admin）。我负责：src/features/lost-found/、src/features/admin/，页面 PG-14、PG-15、PG-16、PG-17、PG-19，以及对应的 src/app/api/ 接口。
实体：LostFoundPost、LostFoundClaim、Report、AuditLog（Schema 改动需 Member 2 review）。验收：LF-AC-01～09。
注意：
- 私密认领说明只能由发布者和管理员读取（LF-AC-06）。在服务端查询时过滤，不得把全量数据传给客户端再隐藏，并写测试证明其他用户读不到。
- 状态流转（Open → Claim Pending → Resolved / Closed / Hidden；Pending → Approved / Rejected）由服务端校验；已解决、已关闭、已隐藏的帖子不能再接受认领。
- 图片上传限制类型、大小和数量（LF-AC-03），在服务端校验，不只依赖前端。
- 不公开显示完整学号、电话等敏感信息；用户名显示为“名 + 姓首字母”。
- 管理员操作写入 AuditLog；/admin 页面和接口都要在服务端校验 ADMIN 角色。
- 帖子缩略图、认领材料不得被 Service Worker 缓存。

本次任务：<例如 feat/lost-found-posts：发帖表单（含校验）、列表、详情页。>
```

---

## 常见问题

**agent 想修改别人的文件或公共组件怎么办？**
让它停下，把需要的改动写进 PR 描述或 Issue，@ 对应负责人。急需时先在自己模块的 `components/` 中做本地版本。

**agent 说某个 Next.js API 不存在或用法不同？**
本项目使用 Next.js 16，让 agent 查阅 `node_modules/next/dist/docs/` 中的对应文档，不要按旧版本写法。

**agent 想升级依赖或改 ESLint / Tailwind 配置？**
不允许在功能 PR 中修改。确有需要，提 Issue 给 Member 1。
