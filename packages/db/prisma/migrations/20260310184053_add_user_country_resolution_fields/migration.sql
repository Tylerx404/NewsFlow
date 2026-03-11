-- CreateEnum
CREATE TYPE "CountrySource" AS ENUM ('PHONE', 'IP', 'ACCEPT_LANGUAGE', 'DEFAULT');

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "countryCode" TEXT,
ADD COLUMN     "countrySource" "CountrySource",
ADD COLUMN     "phoneNumber" TEXT;
