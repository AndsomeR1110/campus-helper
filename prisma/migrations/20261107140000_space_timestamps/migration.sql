-- Review follow-up for #17: the Space models were the only ones without timestamps.
--
-- `ADD COLUMN ... NOT NULL` fails on a non-empty table, so both new columns get a default
-- (`CURRENT_TIMESTAMP`). Prisma keeps `updatedAt` in sync from now on; the default only
-- matters for rows that already existed when this migration ran.

-- AlterTable
ALTER TABLE "Space"
  ADD COLUMN "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "SpaceBooking"
  ADD COLUMN "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
