CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE TYPE "SeatType" AS ENUM ('QUIET', 'DISCUSSION', 'COMPUTER');
CREATE TABLE "Space" (
 "id" TEXT PRIMARY KEY, "campus" TEXT NOT NULL, "building" TEXT NOT NULL,
 "floor" INTEGER NOT NULL, "seat" TEXT NOT NULL, "type" "SeatType" NOT NULL,
 "discussion" BOOLEAN NOT NULL, "capacity" INTEGER NOT NULL CHECK ("capacity" > 0), "power" BOOLEAN NOT NULL
);
CREATE INDEX "Space_building_floor_type_idx" ON "Space" ("building", "floor", "type");
CREATE TABLE "SpaceBooking" (
 "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
 "spaceId" TEXT NOT NULL REFERENCES "Space"("id") ON DELETE RESTRICT,
 "startsAt" TIMESTAMPTZ(3) NOT NULL, "endsAt" TIMESTAMPTZ(3) NOT NULL,
 "status" "BookingStatus" NOT NULL DEFAULT 'CONFIRMED',
 "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "cancelledAt" TIMESTAMPTZ(3),
 CONSTRAINT "space_booking_duration" CHECK ("endsAt" - "startsAt" BETWEEN INTERVAL '30 minutes' AND INTERVAL '180 minutes'),
 CONSTRAINT "space_booking_alignment" CHECK (mod(extract(epoch from "startsAt"), 1800) = 0 AND mod(extract(epoch from "endsAt"), 1800) = 0),
 CONSTRAINT "space_booking_seat_overlap" EXCLUDE USING gist ("spaceId" WITH =, tstzrange("startsAt", "endsAt", '[)') WITH &&) WHERE ("status" = 'CONFIRMED'),
 CONSTRAINT "space_booking_student_overlap" EXCLUDE USING gist ("userId" WITH =, tstzrange("startsAt", "endsAt", '[)') WITH &&) WHERE ("status" = 'CONFIRMED')
);
CREATE INDEX "SpaceBooking_userId_status_idx" ON "SpaceBooking" ("userId", "status");
CREATE INDEX "SpaceBooking_spaceId_startsAt_endsAt_idx" ON "SpaceBooking" ("spaceId", "startsAt", "endsAt");
