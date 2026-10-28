# CAMPUS HELPER — 协作开发规范（Contributing Guide）

> 适用于全体 5 名成员。本规范与 PRD V1.0 及团队分工文档配套使用。
> 规范的修改通过 PR 提交，由 Member 1（项目负责人）合并。

相关文档：

- [UI/UX 设计规范](docs/design/ui-ux-spec.md)：颜色、字体、组件、交互状态、文案
- [前端架构规范](docs/frontend-architecture.md)：目录结构、路由、组件分层、数据获取

---

## 1. 分支规范

| 类型        | 格式                   | 示例                             |
| ----------- | ---------------------- | -------------------------------- |
| 新功能      | `feat/<module>-<task>` | `feat/space-availability`        |
| 缺陷修复    | `fix/<module>-<desc>`  | `fix/office-hour-double-booking` |
| 工程 / 配置 | `chore/<desc>`         | `chore/project-setup`            |
| 文档        | `docs/<desc>`          | `docs/api-spec`                  |
| 测试        | `test/<module>-<desc>` | `test/lost-found-e2e`            |

- 所有分支从**最新的 `main`** 创建：`git switch main && git pull && git switch -c feat/xxx`。
- `main` 受保护：禁止直接推送，禁止 force push。
- 一个分支只做一件事；分支合并后删除。
- 开发期间定期同步 `main`（`git merge origin/main`），不要等到最后一天再处理冲突。

## 2. Commit 规范

采用 [Conventional Commits](https://www.conventionalcommits.org/)，**使用英文**：

```
<type>(<scope>): <summary>
```

| type       | 含义                   |
| ---------- | ---------------------- |
| `feat`     | 新功能                 |
| `fix`      | 修复缺陷               |
| `style`    | 仅格式调整，无逻辑变化 |
| `refactor` | 重构，无功能变化       |
| `test`     | 添加或修改测试         |
| `docs`     | 文档                   |
| `chore`    | 构建、依赖、配置       |

`scope` 使用模块名：`ui`、`layout`、`pwa`、`auth`、`office-hours`、`spaces`、`bookings`、`courses`、`schedule`、`notifications`、`lost-found`、`admin`、`db`。

示例：

```
feat(spaces): filter seats by building, floor and seat type
fix(office-hours): reject booking for slots that already started
test(lost-found): cover private claim visibility (LF-AC-06)
```

- summary 使用祈使句、小写开头、不加句号、不超过 72 字符。
- 每个 commit 应能通过 lint 和 typecheck。

## 3. Pull Request 流程

1. **尽早开 Draft PR**，方便他人了解进度和提前发现冲突。
2. 按 [PR 模板](.github/pull_request_template.md) 填写：功能说明、关联的 PG / AC 编号、测试步骤、截图（375px 手机截图必填）。
3. CI（lint、typecheck、test）全部通过后再标记为 Ready for review。
4. 至少获得 **1 位非作者成员** 的 Approve。
5. 由 **Member 1** 合并，统一使用 **Squash and merge**，合并后的标题沿用 Commit 规范。
6. Review 应在 **48 小时内** 回复；无法及时 Review 时在群里说明。

**PR 大小建议**：单个 PR 改动尽量控制在 400 行以内（不含锁文件、迁移文件和种子数据）。超出时拆分。

### Review 检查重点

- 是否满足对应 PRD 验收标准（AC）。
- 权限是否在**服务端**检查；状态变化是否由服务端决定。
- 是否使用了公共 UI 组件和语义化颜色 Token，而不是自建样式（见设计规范第 10 节）。
- 是否覆盖 Loading / Empty / Error 三种状态。
- 是否包含真实密钥、真实个人信息或调试代码。

## 4. 代码所有权与跨模块修改

| 路径                                                                                    | 负责人   | 修改要求                                                        |
| --------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------- |
| `src/components/ui/`、`src/app/layout.tsx`、`src/app/globals.css`、设计 Token、PWA 配置 | Member 1 | 其他成员需要新组件或修改组件时，先提 Issue 或在 PR 中 @Member 1 |
| `prisma/schema.prisma`、`prisma/migrations/`、`src/lib/auth/`                           | Member 2 | 任何 Schema 改动必须由 Member 2 Review                          |
| `src/features/office-hours/`                                                            | Member 2 |                                                                 |
| `src/features/spaces/`、`src/features/bookings/`                                        | Member 3 |                                                                 |
| `src/features/courses/`、`src/features/notifications/`、统一日程接口                    | Member 4 | 统一日程事件类型和通知接口的变更需 Member 4 确认                |
| `src/features/lost-found/`、`src/features/admin/`                                       | Member 5 |                                                                 |
| `package.json` 新增依赖                                                                 | 提出者   | 在 PR 中说明用途和替代方案，由 Member 1 确认                    |

- **不得直接修改他人模块的内部文件**。需要调用其他模块时，只能通过该模块的 `index.ts` 公开接口（见前端架构规范第 4 节）。
- 业务模块需要的通用组件若尚未提供，可先在本模块的 `components/` 中实现，再提 Issue 申请提升为公共组件。

## 5. 代码风格

- TypeScript `strict` 模式。禁止无说明的 `any`；确有必要时添加注释说明原因。
- 由 ESLint + Prettier 统一格式，不手动争论格式问题。推送前运行 `npm run check`（lint + 格式检查 + 类型检查 + 测试）。
- 路径导入使用别名 `@/`，例如 `import { Button } from "@/components/ui/button"`。

### 命名约定

| 对象             | 约定                        | 示例                                       |
| ---------------- | --------------------------- | ------------------------------------------ |
| 文件名、文件夹名 | `kebab-case`                | `booking-card.tsx`、`time-slot-picker.tsx` |
| React 组件       | `PascalCase`                | `BookingCard`                              |
| 函数、变量       | `camelCase`                 | `getAvailableSeats`                        |
| 常量             | `UPPER_SNAKE_CASE`          | `MAX_BOOKING_MINUTES`                      |
| 类型、接口       | `PascalCase`，不加 `I` 前缀 | `SpaceBooking`、`ScheduleEvent`            |
| 枚举值 / 状态    | 与 Prisma 枚举保持一致      | `CONFIRMED`、`CANCELLED`                   |
| API 路径         | 复数名词、`kebab-case`      | `/api/office-slots/[id]/bookings`          |
| 测试文件         | 与被测文件同名 + `.test.ts` | `availability.test.ts`                     |

## 6. API 约定（提案，需 Member 2 在 `feat/database-foundation` 中确认）

- 路由处理器放在 `src/app/api/`，业务逻辑放在 `src/features/<module>/server/`，路由文件只做参数解析、鉴权和调用。
- 所有请求体使用 **zod** 校验，schema 放在 `src/features/<module>/schemas.ts`，前后端共用。
- 统一响应格式：

```jsonc
// 成功
{ "data": { ... } }

// 失败
{ "error": { "code": "SLOT_ALREADY_BOOKED", "message": "This slot has just been booked by someone else." } }
```

| HTTP 状态码   | 使用场景                                        |
| ------------- | ----------------------------------------------- |
| `200` / `201` | 成功 / 创建成功                                 |
| `400`         | 参数校验失败（`VALIDATION_ERROR`，附 `fields`） |
| `401`         | 未登录                                          |
| `403`         | 已登录但无权限                                  |
| `404`         | 资源不存在或对当前用户不可见                    |
| `409`         | 业务冲突：重复预约、时段已满、状态不允许变更    |
| `429`         | 触发频率限制                                    |
| `500`         | 服务器错误，不暴露内部信息                      |

- `error.code` 使用 `UPPER_SNAKE_CASE`，前端根据 `code` 决定提示，`message` 可直接展示给用户。
- **不信任客户端传入的身份和最终状态**：用户 ID 从会话中获取；状态变化通过动作接口（如 `POST /api/space-bookings/[id]/cancel`）完成，而不是 `PATCH { status: "CANCELLED" }`。

## 7. 数据库与演示数据

- Schema 修改必须通过 Prisma Migration 提交，不得手动修改数据库。
- 每个成员为自己的模块维护种子数据，统一由 `prisma/seed.ts` 调用。
- 种子数据只能使用**虚构**的人名、学号和联系方式。
- 时间统一以 UTC 存储，按 `Asia/Shanghai` 展示和计算课程周次。

## 8. 环境变量与密钥

- 所有密钥放在 `.env.local`，**不得提交**。新增变量时同步更新 `.env.example`（只写变量名和说明）。
- 客户端可读变量必须以 `NEXT_PUBLIC_` 开头，且不得包含任何密钥。
- 不小心提交了密钥时，立即通知 Member 1 并更换该密钥；仅删除 commit 不足以补救。

## 9. 测试

| 层级       | 工具                | 覆盖内容                                         |
| ---------- | ------------------- | ------------------------------------------------ |
| 单元测试   | Vitest              | 时间计算、冲突规则、字段校验、提醒时间、权限判断 |
| 集成测试   | Vitest + 测试数据库 | API、事务、并发预约                              |
| 端到端测试 | Playwright          | PRD 12.2 节 TC-01 ~ TC-10                        |

- 测试名称中标注对应的 AC 编号，例如 `it("rejects a second booking for the same slot (OH-AC-04)")`。
- 每个 P0 业务规则至少有一个自动化测试。

## 10. 完成定义（Definition of Done）

与 PRD 第 15 节一致。PR 合并前须满足：

- [ ] 页面符合 UI/UX 设计规范
- [ ] 前后端接口已连接，数据正确持久化
- [ ] 角色权限已在服务端验证
- [ ] 正常和异常流程都有反馈（Loading / Empty / Error / Success）
- [ ] 对应 AC 已通过，并附测试结果
- [ ] 375px / 768px / 1280px 下布局正常
- [ ] 无影响核心流程的严重 Bug
- [ ] 文档已同步更新

## 11. 沟通

- 任务使用 GitHub Issues 跟踪，标签：`module:<name>`、`type:bug|feature|design|docs`、`priority:P0|P1`。
- 需要他人配合的接口或数据结构，先在 Issue 中达成一致，再开始开发。
- 每周一次进度同步，确认当周 PR 合并计划和阻塞事项。
