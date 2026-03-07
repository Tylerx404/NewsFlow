-- CreateEnum
CREATE TYPE "AiUsageStatus" AS ENUM ('SUCCESS', 'FAILED');

-- AlterTable
ALTER TABLE "ai_config" ADD COLUMN     "isEnabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "ai_usage" ADD COLUMN     "durationMs" INTEGER,
ADD COLUMN     "errorSummary" TEXT,
ADD COLUMN     "status" "AiUsageStatus" NOT NULL DEFAULT 'SUCCESS';

-- CreateIndex
CREATE INDEX "ai_usage_status_createdAt_idx" ON "ai_usage"("status", "createdAt");
