# Database Foundation — 设计说明与迁移步骤

> **Owner:** Member 2（Authentication & Office Hour）
> **PR:** `feat/database-foundation`
> **作用:** 全组的数据库约定。任何 Schema 改动都要按第 6 节的清单走 Member 2 的 review。

---

## 1. 技术选型

| 项     | 选择                                 | 理由                                                       |
| ------ | ------------------------------------ | ---------------------------------------------------------- |
| 数据库 | **PostgreSQL**                       | 需要 `Timestamptz`、部分唯一索引 —— 并发预约的硬保证靠它们 |
| ORM    | **Prisma 6.19.3**                    | schema 即文档，migration 可 review                         |
| 认证   | 自建 JWT（见 `feat/auth-and-roles`） | 单密码登录，避免 Auth.js v5 在 Next 16 上的 beta 依赖      |

> ⚠️ **为什么锁 6.x**：npm 上 `prisma` 的 `latest` 当前解析到 `8.0.0-rc`，而 **Prisma 7+ 移除了
> `datasource.url`**（必须配 `prisma.config.ts` + 驱动适配器）。为保持 `src/lib/db.ts` 简单
> 与全组写法一致，统一用 `6.19.3`。升级 Prisma 是单独一个 chore PR，不要顺手升。

---

## 2. 状态枚举与 STATUS_MAP 对齐

`src/components/ui/status-badge.tsx` 要求「Enum values must match the Prisma schema」。

| 表                     | 枚举                                                | 说明                                                                                    |
| ---------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `OfficeSlot.status`    | `OPEN` / `CANCELLED`                                | **`BOOKED` 不落库** —— 由 `OfficeBooking` 里存在 `CONFIRMED` 行推导，避免冗余状态不同步 |
| `OfficeBooking.status` | `CONFIRMED` / `CANCELLED` / `COMPLETED` / `EXPIRED` | 与 `STATUS_MAP.booking` 一致；`EXPIRED` 由 Member 4 的后台任务在时段过后写入            |

前端展示映射（在页面组件内做，不改 UI 组件）：

- 时段被他人占用 → `<StatusBadge kind="slot" status="BOOKED">`（"Booked"）
- 教师撤销时段 → `<StatusBadge kind="slot" status="CANCELLED">`（"Withdrawn"）
- 我自己的有效预约 → `<StatusBadge kind="booking" status="CONFIRMED">`（"Confirmed"）

---

## 3. ⭐ 防重复预约：两层防护（OH-AC-03）

**第 1 层 — 数据库部分唯一索引（硬保证）**

Prisma schema 无法表达 partial unique index，所以在 migrate 时手写 SQL：

```sql
-- 一个时段只能有一条「有效」预约；CANCELLED / COMPLETED / EXPIRED 不受限
CREATE UNIQUE INDEX IF NOT EXISTS "office_bookings_active_slot_unique"
  ON "OfficeBooking" ("slotId")
  WHERE "status" = 'CONFIRMED';
```

> ⚠️ 本项目用 Prisma 默认命名（表 `"OfficeBooking"`、列 `"slotId"`，带引号）。
> 若将来加 `@map`/`@@map` 改成 snake_case，**这个索引的列名必须同步改**，否则静默失效。

**第 2 层 — 事务 + 唯一冲突捕获（给人话的 409）**

`src/features/office-hours/server/mutations.ts` 的 `createBooking`：
Serializable 事务里检查 slot 状态 → create → 捕获 `P2002` 转成
`ApiError("SLOT_ALREADY_BOOKED")`（HTTP 409）。

| 只有索引     | 只有事务             |
| ------------ | -------------------- |
| 用户看到 500 | 高并发下仍有竞态窗口 |
| 错误信息难懂 | 没有最终保证         |

**索引是最后一道闸，事务是为了在闸落下之前给出可读的提示。**

### 如果以后 `capacity > 1`

删掉部分唯一索引，改用 `SELECT … FOR UPDATE` 锁 slot 行 + 统计有效预约数。
现在 PRD 是 1 人/时段，**不要动**。

### ⚠️ 业务状态会变化时，唯一约束必须带 `WHERE`（partial index）

code review 抓到过两个"过度约束"的 `@@unique`。它们都不是并发问题，而是**历史状态挡住了未来状态**。
两个都已删除，以后不要再加回来：

| 被删掉的普通唯一约束                       | 它为什么会出错                                                                                                | 现在的做法                                                                                                |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `OfficeBooking(slotId, studentId, status)` | 同一学生对同一时段「预约 → 取消 → 再预约 → 再取消」需要**两条 CANCELLED**，唯一约束直接报错，学生永远取消不掉 | 删除；防重复只需 `office_bookings_active_slot_unique`（`WHERE status='CONFIRMED'`）+ 事务里的已预约检查   |
| `OfficeSlot(teacherId, startsAt)`          | 教师撤销时段后，那条 CANCELLED 记录仍占着 `(teacherId, startsAt)`，**同一时间再也无法重新开放**               | 换成 `office_slots_open_teacher_start_unique ON "OfficeSlot"("teacherId","startsAt") WHERE status='OPEN'` |

验证方式（`migrations/…_drop_booking_status_unique`、`…_partial_unique_open_slot` 之后）：

```sql
-- 1) 同一学生两次「预约→取消」都成功
INSERT ... CONFIRMED; UPDATE ... CANCELLED; INSERT ... CONFIRMED; UPDATE ... CANCELLED;
-- 2) 撤销时段后同一时间可以再建
UPDATE "OfficeSlot" SET status='CANCELLED' ...; INSERT ... ('OPEN', 同一时间);  -- 成功
-- 3) 但同一时段仍然只能有一个人
INSERT ... CONFIRMED;  INSERT ... CONFIRMED;  -- 第二个必须报 unique violation
```

> 教训：**状态会变，唯一约束就要加 `WHERE`**；Prisma 的 `@@unique` 表达不了 partial index，
> 必须手写进 `migration.sql`。

---

## 4. 时区

| 层     | 约定                                                       |
| ------ | ---------------------------------------------------------- |
| 数据库 | 一律 `Timestamptz`，存 UTC                                 |
| API    | ISO 8601 带时区字符串                                      |
| 前端   | **用 `@/lib/time.ts`（Member 1 维护）** 展示 Asia/Shanghai |

不要在代码里手写 `+8`。`datetime-local` 表单值的转换在
`src/features/office-hours/datetime-local.ts`（模块内，不进 `lib/time.ts`）。

---

## 5. 迁移步骤（Member 2 执行顺序）

```bash
git switch main && git pull
git switch -c feat/database-foundation

npm ci
npm install --save-exact @prisma/client@6.19.3 bcryptjs@3.0.3 jose@6.2.13 zod@3.25.76
npm install --save-dev --save-exact prisma@6.19.3

# .env.local 里配 DATABASE_URL（本地 Postgres）
npm run db:generate
npm run db:migrate    # 会创建并应用 migrations
npm run db:seed       # 8 用户 / 5 教师 / 11 时段 / 1 条示例预约

# 验证约束真的生效（第 3 节第 1 层）
npx prisma studio     # 或 psql：同 slotId 插两条 CONFIRMED，第二条必须报错

npm run check         # lint + format:check + typecheck + test
```

---

## 6. Schema 变更 Review 清单（Member 2 的职责）

- [ ] 新模型有没有 `id` / `createdAt` / `updatedAt`？
- [ ] 时间字段是不是 `@db.Timestamptz(3)`？
- [ ] 每个关系都写了 `onDelete` 吗？
- [ ] 外键字段有没有索引？（Prisma 不会自动给 FK 建索引）
- [ ] 枚举值是否与 `STATUS_MAP` 对齐？**改了 schema 枚举就要同步改 status-badge.tsx**（需 @Member 1）
- [ ] 敏感字段（`passwordHash`、认领私密留言）会不会被返回给前端？
- [ ] 业务对象是软删除（状态字段）而不是物理 `delete`？
- [ ] 手写 SQL 迁移里的列名大小写与模型一致？

---

## 7. 其他模块的交接约定

| 负责   | 实体                                                         | 特别注意                                                                    |
| ------ | ------------------------------------------------------------ | --------------------------------------------------------------------------- |
| **M3** | `Space`、`SpaceBooking`                                      | 区间重叠**不能**用唯一索引 → `tstzrange` 排除约束或在事务里查重叠           |
| **M4** | `Course`、`CourseOccurrence`、`ReminderRule`、`Notification` | 通知必须有 `dedupeKey @unique`；负责把过期的 `CONFIRMED` 预约置为 `EXPIRED` |
| **M5** | `LostFoundPost`、`LostFoundClaim`、`Report`、`AuditLog`      | `LostFoundClaim.message` 私密 → API 层只允许发布者/管理员读                 |
