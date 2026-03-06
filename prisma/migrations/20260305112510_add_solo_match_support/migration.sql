-- CreateEnum
CREATE TYPE "MatchType" AS ENUM ('TEAM', 'SOLO');

-- AlterTable
ALTER TABLE "matches" ADD COLUMN     "matchType" "MatchType" NOT NULL DEFAULT 'TEAM';

-- AlterTable
ALTER TABLE "teams" ADD COLUMN     "isSolo" BOOLEAN NOT NULL DEFAULT false;
