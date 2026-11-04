-- Lost & Found schema (issue #31, part 2). Owner: Member 5. Schema review: Member 2.
--
-- Generated with:
--   prisma migrate diff --from-schema-datamodel <before> --to-schema-datamodel prisma/schema.prisma --script
-- The partial unique indexes at the bottom cannot be expressed in schema.prisma,
-- so they are appended by hand, the same way booking/slot uniqueness is handled.

-- CreateEnum
CREATE TYPE "PostKind" AS ENUM ('LOST', 'FOUND');

-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('OPEN', 'CLAIM_PENDING', 'RESOLVED', 'CLOSED', 'HIDDEN');

-- CreateEnum
CREATE TYPE "PostCategory" AS ENUM ('ELECTRONICS', 'CAMPUS_CARD', 'KEYS', 'BOOKS', 'CLOTHING', 'OTHER');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'RESOLVED', 'DISMISSED');

-- CreateTable
CREATE TABLE "LostFoundPost" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "kind" "PostKind" NOT NULL,
    "category" "PostCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL,
    "status" "PostStatus" NOT NULL DEFAULT 'OPEN',
    "imageName" TEXT,
    "imageType" TEXT,
    "imageSize" INTEGER,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "LostFoundPost_pkey" PRIMARY KEY ("id"),
    -- Guards the same rule the zod schema applies: a photo is either fully
    -- described or absent, and a size can never be zero or negative.
    CONSTRAINT "LostFoundPost_image_complete_check" CHECK (
        ("imageName" IS NULL AND "imageType" IS NULL AND "imageSize" IS NULL AND "imageUrl" IS NULL)
        OR ("imageName" IS NOT NULL AND "imageType" IS NOT NULL AND "imageSize" > 0)
    )
);

-- CreateTable
CREATE TABLE "LostFoundClaim" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "claimantId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "ClaimStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMPTZ(3),

    CONSTRAINT "LostFoundClaim_pkey" PRIMARY KEY ("id"),
    -- A decision always carries its timestamp; an open claim never does.
    CONSTRAINT "LostFoundClaim_decided_check" CHECK (
        ("status" = 'PENDING' AND "decidedAt" IS NULL)
        OR ("status" <> 'PENDING' AND "decidedAt" IS NOT NULL)
    )
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMPTZ(3),
    "handledById" TEXT,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Report_resolved_check" CHECK (
        ("status" = 'PENDING' AND "resolvedAt" IS NULL AND "handledById" IS NULL)
        OR ("status" <> 'PENDING' AND "resolvedAt" IS NOT NULL AND "handledById" IS NOT NULL)
    )
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LostFoundPost_status_createdAt_idx" ON "LostFoundPost"("status", "createdAt");

-- CreateIndex
CREATE INDEX "LostFoundPost_authorId_createdAt_idx" ON "LostFoundPost"("authorId", "createdAt");

-- CreateIndex
CREATE INDEX "LostFoundPost_kind_category_status_idx" ON "LostFoundPost"("kind", "category", "status");

-- CreateIndex
CREATE INDEX "LostFoundPost_occurredAt_idx" ON "LostFoundPost"("occurredAt");

-- CreateIndex
CREATE INDEX "LostFoundClaim_postId_status_idx" ON "LostFoundClaim"("postId", "status");

-- CreateIndex
CREATE INDEX "LostFoundClaim_claimantId_status_idx" ON "LostFoundClaim"("claimantId", "status");

-- CreateIndex
CREATE INDEX "Report_status_createdAt_idx" ON "Report"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Report_postId_idx" ON "Report"("postId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_targetType_targetId_idx" ON "AuditLog"("targetType", "targetId");

-- AddForeignKey
ALTER TABLE "LostFoundPost" ADD CONSTRAINT "LostFoundPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LostFoundClaim" ADD CONSTRAINT "LostFoundClaim_postId_fkey" FOREIGN KEY ("postId") REFERENCES "LostFoundPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LostFoundClaim" ADD CONSTRAINT "LostFoundClaim_claimantId_fkey" FOREIGN KEY ("claimantId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_postId_fkey" FOREIGN KEY ("postId") REFERENCES "LostFoundPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_handledById_fkey" FOREIGN KEY ("handledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Partial unique indexes (hand-written: Prisma cannot express WHERE clauses).

-- One PENDING claim per (post, claimant): a double-submitted form loses the race
-- instead of creating two rows (LF-AC-05).
CREATE UNIQUE INDEX "LostFoundClaim_post_claimant_pending_key"
    ON "LostFoundClaim" ("postId", "claimantId") WHERE "status" = 'PENDING';

-- At most one APPROVED claim per post: two administrators clicking at once cannot
-- hand the same item to two people.
CREATE UNIQUE INDEX "LostFoundClaim_post_approved_key"
    ON "LostFoundClaim" ("postId") WHERE "status" = 'APPROVED';

-- One PENDING report per (post, reporter): reporting twice is a no-op, not a queue
-- of duplicates for the administrator (LF-AC-09).
CREATE UNIQUE INDEX "Report_post_reporter_pending_key"
    ON "Report" ("postId", "reporterId") WHERE "status" = 'PENDING';
