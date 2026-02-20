-- AlterTable
ALTER TABLE "article" ADD COLUMN     "extractionAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastExtractionError" TEXT;

-- AlterTable
ALTER TABLE "feed" ADD COLUMN     "errorCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastError" TEXT,
ADD COLUMN     "nextFetchAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "article_contentExtracted_idx" ON "article"("contentExtracted");

-- CreateIndex
CREATE INDEX "feed_nextFetchAt_idx" ON "feed"("nextFetchAt");
