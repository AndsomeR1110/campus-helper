-- Review follow-up (third item): OfficeSlot had `@@unique([teacherId, startsAt])`.
--
-- A withdrawn slot keeps its row with status = 'CANCELLED', so that plain unique kept
-- occupying (teacherId, startsAt) forever: the teacher could never open a slot at the
-- same time again. Replaced by a PARTIAL unique index that only considers OPEN rows.

-- DropIndex
DROP INDEX "OfficeSlot_teacherId_startsAt_key";

-- A teacher cannot hold two OPEN slots at the same start time.
-- Withdrawn (CANCELLED) slots are ignored, so the time can be reused.
CREATE UNIQUE INDEX IF NOT EXISTS "office_slots_open_teacher_start_unique"
  ON "OfficeSlot" ("teacherId", "startsAt")
  WHERE "status" = 'OPEN';
