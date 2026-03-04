-- AlterTable
ALTER TABLE "subscription" ADD COLUMN     "cancelAt" TIMESTAMP(3),
ADD COLUMN     "endedAt" TIMESTAMP(3),
ADD COLUMN     "seats" INTEGER,
ADD COLUMN     "trialEnd" TIMESTAMP(3),
ADD COLUMN     "trialStart" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "stripeCustomerId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "user_stripeCustomerId_key" ON "user"("stripeCustomerId");
