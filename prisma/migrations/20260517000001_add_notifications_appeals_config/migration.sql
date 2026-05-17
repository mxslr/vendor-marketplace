-- Migration: add_notifications_appeals_config
-- Adds: Appeal model, Notification model, SystemConfig model,
--       frozenDeadline on Order, verificationNote on Transaction,
--       AppealStatus enum, NotificationType enum

-- Enums
CREATE TYPE "AppealStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');

CREATE TYPE "NotificationType" AS ENUM (
  'NEW_ORDER', 'ORDER_DELIVERED', 'ORDER_COMPLETED', 'ORDER_REFUNDED',
  'PAYMENT_PENDING', 'PAYMENT_CONFIRMED', 'PAYMENT_REJECTED',
  'WITHDRAWAL_COMPLETED', 'WITHDRAWAL_REJECTED',
  'DISPUTE_OPENED', 'DISPUTE_RESOLVED',
  'KYB_APPROVED', 'KYB_REJECTED',
  'APPEAL_RECEIVED', 'SYSTEM'
);

-- Add frozenDeadline to Order
ALTER TABLE "Order" ADD COLUMN "frozenDeadline" TIMESTAMP(3);

-- Add verificationNote to Transaction
ALTER TABLE "Transaction" ADD COLUMN "verificationNote" TEXT;

-- Create Appeal table
CREATE TABLE "Appeal" (
  "id"          SERIAL PRIMARY KEY,
  "orderId"     INTEGER NOT NULL,
  "requesterId" INTEGER NOT NULL,
  "reason"      TEXT NOT NULL,
  "status"      "AppealStatus" NOT NULL DEFAULT 'PENDING',
  "resolvedBy"  INTEGER,
  "resolution"  TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt"  TIMESTAMP(3),
  CONSTRAINT "Appeal_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Appeal_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Appeal_resolvedBy_fkey" FOREIGN KEY ("resolvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Create Notification table
CREATE TABLE "Notification" (
  "id"        SERIAL PRIMARY KEY,
  "userId"    INTEGER NOT NULL,
  "type"      "NotificationType" NOT NULL,
  "title"     TEXT NOT NULL,
  "message"   TEXT NOT NULL,
  "isRead"    BOOLEAN NOT NULL DEFAULT false,
  "metadata"  TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Create SystemConfig table
CREATE TABLE "SystemConfig" (
  "id"        SERIAL PRIMARY KEY,
  "key"       TEXT NOT NULL,
  "value"     TEXT NOT NULL,
  "updatedBy" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SystemConfig_key_key" UNIQUE ("key")
);

-- Seed default system configs
INSERT INTO "SystemConfig" ("key", "value") VALUES
  ('maintenance_mode', 'false'),
  ('maintenance_message', 'Sistem sedang dalam pemeliharaan. Silakan coba lagi nanti.'),
  ('default_commission_rate', '5');
