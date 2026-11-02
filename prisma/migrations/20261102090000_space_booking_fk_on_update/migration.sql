-- The hand-written 20261030130000_space_booking migration created the
-- SpaceBooking foreign keys without ON UPDATE CASCADE, which Prisma uses by
-- default. Without this, every `prisma migrate dev` detected drift and
-- generated a migration recreating both keys. Align them with schema.prisma.
ALTER TABLE "SpaceBooking"
  DROP CONSTRAINT "SpaceBooking_userId_fkey",
  ADD CONSTRAINT "SpaceBooking_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SpaceBooking"
  DROP CONSTRAINT "SpaceBooking_spaceId_fkey",
  ADD CONSTRAINT "SpaceBooking_spaceId_fkey"
    FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
