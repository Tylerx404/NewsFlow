/*
  Warnings:

  - You are about to drop the `article` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `feed` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "article" DROP CONSTRAINT "article_feedId_fkey";

-- DropForeignKey
ALTER TABLE "feed" DROP CONSTRAINT "feed_userId_fkey";

-- DropTable
DROP TABLE "article";

-- DropTable
DROP TABLE "feed";

-- CreateTable
CREATE TABLE "feed_source" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "normalizedUrl" TEXT NOT NULL,
    "siteUrl" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "iconUrl" TEXT,
    "language" TEXT,
    "lastFetched" TIMESTAMP(3),
    "lastError" TEXT,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "nextFetchAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feed_source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feed_subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "feedSourceId" TEXT NOT NULL,
    "customTitle" TEXT,
    "category" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feed_subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_article" (
    "id" TEXT NOT NULL,
    "feedSourceId" TEXT NOT NULL,
    "articleKey" TEXT NOT NULL,
    "guid" TEXT,
    "title" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "author" TEXT,
    "pubDate" TIMESTAMP(3) NOT NULL,
    "content" TEXT,
    "excerpt" TEXT,
    "image" TEXT,
    "categories" TEXT[],
    "contentExtracted" BOOLEAN NOT NULL DEFAULT false,
    "extractionAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastExtractionError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "source_article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_article_state" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceArticleId" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "saved" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "savedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_article_state_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "feed_source_normalizedUrl_key" ON "feed_source"("normalizedUrl");

-- CreateIndex
CREATE INDEX "feed_source_nextFetchAt_idx" ON "feed_source"("nextFetchAt");

-- CreateIndex
CREATE INDEX "feed_subscription_userId_idx" ON "feed_subscription"("userId");

-- CreateIndex
CREATE INDEX "feed_subscription_feedSourceId_idx" ON "feed_subscription"("feedSourceId");

-- CreateIndex
CREATE INDEX "feed_subscription_isActive_idx" ON "feed_subscription"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "feed_subscription_userId_feedSourceId_key" ON "feed_subscription"("userId", "feedSourceId");

-- CreateIndex
CREATE INDEX "source_article_feedSourceId_pubDate_idx" ON "source_article"("feedSourceId", "pubDate" DESC);

-- CreateIndex
CREATE INDEX "source_article_contentExtracted_idx" ON "source_article"("contentExtracted");

-- CreateIndex
CREATE UNIQUE INDEX "source_article_feedSourceId_articleKey_key" ON "source_article"("feedSourceId", "articleKey");

-- CreateIndex
CREATE INDEX "user_article_state_userId_idx" ON "user_article_state"("userId");

-- CreateIndex
CREATE INDEX "user_article_state_sourceArticleId_idx" ON "user_article_state"("sourceArticleId");

-- CreateIndex
CREATE INDEX "user_article_state_read_idx" ON "user_article_state"("read");

-- CreateIndex
CREATE INDEX "user_article_state_saved_idx" ON "user_article_state"("saved");

-- CreateIndex
CREATE UNIQUE INDEX "user_article_state_userId_sourceArticleId_key" ON "user_article_state"("userId", "sourceArticleId");

-- AddForeignKey
ALTER TABLE "feed_subscription" ADD CONSTRAINT "feed_subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_subscription" ADD CONSTRAINT "feed_subscription_feedSourceId_fkey" FOREIGN KEY ("feedSourceId") REFERENCES "feed_source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_article" ADD CONSTRAINT "source_article_feedSourceId_fkey" FOREIGN KEY ("feedSourceId") REFERENCES "feed_source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_article_state" ADD CONSTRAINT "user_article_state_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_article_state" ADD CONSTRAINT "user_article_state_sourceArticleId_fkey" FOREIGN KEY ("sourceArticleId") REFERENCES "source_article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
