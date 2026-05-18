-- Migration: add_missing_columns
-- Adds all columns/enums that were applied via prisma db push
-- but never recorded in a migration file.

-- 1. FeaturedStatus enum (used by Gig.featuredStatus)
CREATE TYPE "FeaturedStatus" AS ENUM ('NONE', 'FEATURED');

-- 2. Gig: featuredStatus, featuredUntil
ALTER TABLE "Gig"
  ADD COLUMN "featuredStatus" "FeaturedStatus" NOT NULL DEFAULT 'NONE',
  ADD COLUMN "featuredUntil"  TIMESTAMP(3);

-- 3. Order: deliveredAt, snapToken, paymentMethod, midtransTransactionId
ALTER TABLE "Order"
  ADD COLUMN "deliveredAt"           TIMESTAMP(3),
  ADD COLUMN "snapToken"             TEXT,
  ADD COLUMN "paymentMethod"         TEXT,
  ADD COLUMN "midtransTransactionId" TEXT;

CREATE UNIQUE INDEX "Order_midtransTransactionId_key"
  ON "Order"("midtransTransactionId");

-- 4. Merchant: withdrawalPin, suspendedUntil
ALTER TABLE "Merchant"
  ADD COLUMN "withdrawalPin"  TEXT,
  ADD COLUMN "suspendedUntil" TIMESTAMP(3);

-- 5. CustomOffer: gigId (NOT NULL — safe if table is empty in dev;
--    default 0 guards against any stray rows)
ALTER TABLE "CustomOffer"
  ADD COLUMN "gigId" INTEGER NOT NULL DEFAULT 0;

-- Drop the default immediately so future inserts must supply a real value
ALTER TABLE "CustomOffer"
  ALTER COLUMN "gigId" DROP DEFAULT;

ALTER TABLE "CustomOffer"
  ADD CONSTRAINT "CustomOffer_gigId_fkey"
    FOREIGN KEY ("gigId") REFERENCES "Gig"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
