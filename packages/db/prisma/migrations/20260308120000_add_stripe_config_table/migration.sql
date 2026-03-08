CREATE TABLE "stripe_config" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "publishableKey" TEXT,
    "secretKeyEncrypted" TEXT,
    "webhookSecretEncrypted" TEXT,
    "priceBasicMonthly" TEXT,
    "priceBasicYearly" TEXT,
    "priceProMonthly" TEXT,
    "priceProYearly" TEXT,
    "priceMaxMonthly" TEXT,
    "priceMaxYearly" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stripe_config_pkey" PRIMARY KEY ("id")
);
