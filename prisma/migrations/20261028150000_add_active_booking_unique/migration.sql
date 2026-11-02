-- 一个 Office Hour 时段只能有一条「有效」预约（OH-AC-03 的数据库层硬保证）。
-- CANCELLED / COMPLETED / EXPIRED 不受此索引约束：取消后时段立即恢复可预约。
--
-- 为什么手写：Prisma schema 无法表达 partial unique index（带 WHERE 的唯一索引）。
-- 两个学生并发预约同一个名额时，数据库只允许一个事务成功，另一个必须失败。
--
-- ⚠️ 如果将来某个模型加了 @map/@@map 改成 snake_case，本索引的列名必须同步修改，
--    否则会静默失效。详见 docs/database-foundation.md §3。

CREATE UNIQUE INDEX IF NOT EXISTS "office_bookings_active_slot_unique"
  ON "OfficeBooking" ("slotId")
  WHERE "status" = 'CONFIRMED';
