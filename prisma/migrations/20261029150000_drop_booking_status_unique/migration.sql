-- The (slotId, studentId, status) unique key stopped a student from cancelling
-- the same slot twice (book → cancel → rebook → cancel failed with a unique
-- violation on the second CANCELLED row). The partial unique index
-- "office_bookings_active_slot_unique" (WHERE status = 'CONFIRMED') already
-- guarantees one active booking per slot, including double-submits.
DROP INDEX IF EXISTS "OfficeBooking_slotId_studentId_status_key";
