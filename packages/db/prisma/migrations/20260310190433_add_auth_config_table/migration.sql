-- CreateTable
CREATE TABLE "auth_config" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "googleClientId" TEXT,
    "googleClientSecretEncrypted" TEXT,
    "appleClientId" TEXT,
    "appleClientSecretEncrypted" TEXT,
    "appleAppBundleIdentifier" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_config_pkey" PRIMARY KEY ("id")
);
