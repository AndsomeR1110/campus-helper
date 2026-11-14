CREATE TABLE "SchoolTimetable" (
  "ownerId" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "syncedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SchoolTimetable_pkey" PRIMARY KEY ("ownerId"),
  CONSTRAINT "SchoolTimetable_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
