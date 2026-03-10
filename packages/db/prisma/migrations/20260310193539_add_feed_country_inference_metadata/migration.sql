-- CreateEnum
CREATE TYPE "FeedInferenceSource" AS ENUM ('LANG_DETECTION', 'MANUAL', 'DEFAULT');

-- AlterTable
ALTER TABLE "feed_source" ADD COLUMN     "inferenceConfidence" DOUBLE PRECISION,
ADD COLUMN     "inferenceSource" "FeedInferenceSource",
ADD COLUMN     "inferredAt" TIMESTAMP(3),
ADD COLUMN     "inferredCountryCode" TEXT,
ADD COLUMN     "inferredLanguage" TEXT;

-- CreateIndex
CREATE INDEX "feed_source_inferredCountryCode_idx" ON "feed_source"("inferredCountryCode");
