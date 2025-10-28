-- ========================================
-- SCRIPT SQL POUR CRÉER LES TABLES DE CRÉDIT
-- ========================================
-- Copiez et collez ce script dans l'éditeur SQL de Supabase
-- puis cliquez sur "Run" pour l'exécuter

-- 1. Créer les enums
DO $$ BEGIN
  CREATE TYPE "Plan" AS ENUM ('FREE', 'PRO', 'BUSINESS');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "CreditReason" AS ENUM ('ACTION', 'MONTHLY_TOPUP', 'MANUAL_ADJUST', 'PURCHASE', 'REFUND', 'ADMIN_FIX');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ActionType" AS ENUM ('AIRCRAFT_LOOKUP', 'VIEW_FLIGHT_HISTORY', 'BROWSE_FLIGHT', 'BROWSE_AIRPORT', 'UNKNOWN');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Créer les tables
CREATE TABLE IF NOT EXISTS "subscriptions" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "plan" "Plan" NOT NULL DEFAULT 'FREE',
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
  "renewsAt" TIMESTAMP(3) NOT NULL,
  "stripeCustomerId" TEXT,
  "stripeSubId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "creditBalance" (
  "userId" TEXT NOT NULL,
  "credits" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "creditBalance_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE IF NOT EXISTS "creditLedger" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "delta" INTEGER NOT NULL,
  "reason" "CreditReason" NOT NULL,
  "actionType" "ActionType",
  "refId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "creditLedger_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "usageEvents" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "actionType" "ActionType" NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "cost" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "usageEvents_pkey" PRIMARY KEY ("id")
);

-- 3. Créer les index
CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_userId_key" ON "subscriptions"("userId");
CREATE INDEX IF NOT EXISTS "creditLedger_userId_idx" ON "creditLedger"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "usageEvents_idempotencyKey_key" ON "usageEvents"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "usageEvents_userId_idx" ON "usageEvents"("userId");

-- 4. Ajouter les clés étrangères (optionnel)
-- Ces contraintes peuvent être ajoutées plus tard si nécessaire
-- ALTER TABLE "creditBalance" ADD CONSTRAINT "creditBalance_userId_fkey" 
--   FOREIGN KEY ("userId") REFERENCES "subscriptions"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- ALTER TABLE "creditLedger" ADD CONSTRAINT "creditLedger_userId_fkey" 
--   FOREIGN KEY ("userId") REFERENCES "subscriptions"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- ALTER TABLE "usageEvents" ADD CONSTRAINT "usageEvents_userId_fkey" 
--   FOREIGN KEY ("userId") REFERENCES "subscriptions"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- ========================================
-- FIN DU SCRIPT
-- ========================================
