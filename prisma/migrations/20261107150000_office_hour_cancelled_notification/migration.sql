-- OH-AC-07: a withdrawn office hour slot must notify every student whose booking was
-- cancelled, so the notification type needs a second value.
--
-- `ADD VALUE` is transactional from PostgreSQL 12 onwards; this project runs PG 18.
-- IF NOT EXISTS keeps the migration safe to re-run against a database where somebody
-- already added the value by hand.

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'OFFICE_HOUR_CANCELLED';
