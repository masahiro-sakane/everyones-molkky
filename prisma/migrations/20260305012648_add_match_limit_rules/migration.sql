-- CreateEnum
CREATE TYPE "LimitType" AS ENUM ('NONE', 'TURNS', 'TIME');

-- AlterTable
ALTER TABLE "matches" ADD COLUMN     "limitType" "LimitType" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "startedAt" TIMESTAMP(3),
ADD COLUMN     "timeLimitMinutes" INTEGER,
ADD COLUMN     "turnLimit" INTEGER;
