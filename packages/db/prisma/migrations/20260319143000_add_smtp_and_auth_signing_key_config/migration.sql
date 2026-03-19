-- CreateTable
CREATE TABLE "smtp_config" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "host" TEXT,
    "port" INTEGER,
    "secure" BOOLEAN NOT NULL DEFAULT false,
    "username" TEXT,
    "passwordEncrypted" TEXT,
    "fromEmail" TEXT,
    "fromName" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "smtp_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_signing_key_config" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "algorithm" TEXT NOT NULL DEFAULT 'RS256',
    "publicKeyPem" TEXT,
    "privateKeyPemEncrypted" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_signing_key_config_pkey" PRIMARY KEY ("id")
);
