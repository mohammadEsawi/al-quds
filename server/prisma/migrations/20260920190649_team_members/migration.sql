-- CreateEnum
CREATE TYPE "TeamGroup" AS ENUM ('BOARD', 'EXECUTIVE');

-- CreateEnum
CREATE TYPE "TeamRole" AS ENUM ('CHAIRMAN', 'GENERAL_MANAGER', 'MEMBER');

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "group" "TeamGroup" NOT NULL,
    "role" "TeamRole" NOT NULL DEFAULT 'MEMBER',
    "nameAr" TEXT NOT NULL DEFAULT '',
    "nameEn" TEXT NOT NULL DEFAULT '',
    "titleAr" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "departmentAr" TEXT,
    "departmentEn" TEXT,
    "bio" JSONB NOT NULL DEFAULT '[]',
    "messageAr" TEXT,
    "messageEn" TEXT,
    "photoUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "isSample" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeamMember_group_sortOrder_idx" ON "TeamMember"("group", "sortOrder");
