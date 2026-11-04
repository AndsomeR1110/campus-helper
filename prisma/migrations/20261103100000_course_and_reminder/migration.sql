-- Course + ReminderRule (Member 4, PG-12 / FR-CR-01, FR-CR-04)
-- Reviewed by Member 2 per CONTRIBUTING §7.
--
-- CourseOccurrence is deliberately NOT a table: occurrences are derived from
-- weekday + startTime + the teaching-week range at read time (see issue #7).

-- CreateEnum
CREATE TYPE "Weekday" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "WeekParity" AS ENUM ('ALL', 'ODD', 'EVEN');

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "teacher" TEXT,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "location" TEXT,
    "weekday" "Weekday" NOT NULL,
    "firstWeek" INTEGER NOT NULL,
    "lastWeek" INTEGER NOT NULL,
    "weekParity" "WeekParity" NOT NULL DEFAULT 'ALL',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReminderRule" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "offsetMinutes" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ReminderRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Course_ownerId_code_weekday_startTime_key" ON "Course"("ownerId", "code", "weekday", "startTime");

-- CreateIndex
CREATE INDEX "Course_ownerId_idx" ON "Course"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "ReminderRule_courseId_key" ON "ReminderRule"("courseId");

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderRule" ADD CONSTRAINT "ReminderRule_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
