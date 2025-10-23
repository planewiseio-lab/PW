-- Créer les tables du système de crédits dans Supabase
-- Exécuter ce script dans l'éditeur SQL de Supabase

-- Créer les enums
CREATE TYPE "Plan" AS ENUM ('FREE', 'PRO', 'BUSINESS');
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELED');
CREATE TYPE "CreditReason" AS ENUM ('ACTION', 'MONTHLY_TOPUP', 'MANUAL_ADJUST', 'PURCHASE', 'REFUND', 'ADMIN_FIX');
CREATE TYPE "ActionType" AS ENUM ('AIRCRAFT_LOOKUP', 'VIEW_FLIGHT_HISTORY', 'BROWSE_FLIGHT', 'BROWSE_AIRPORT', 'UNKNOWN');

-- Créer la table subscriptions
CREATE TABLE "subscriptions" (
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

-- Créer la table credit_balances
CREATE TABLE "credit_balances" (
    "userId" TEXT NOT NULL,
    "credits" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "credit_balances_pkey" PRIMARY KEY ("userId")
);

-- Créer la table credit_ledger
CREATE TABLE "credit_ledger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" "CreditReason" NOT NULL,
    "actionType" "ActionType",
    "refId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "credit_ledger_pkey" PRIMARY KEY ("id")
);

-- Créer la table usage_events
CREATE TABLE "usage_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "actionType" "ActionType" NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "cost" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "usage_events_pkey" PRIMARY KEY ("id")
);

-- Créer les index
CREATE UNIQUE INDEX "subscriptions_userId_key" ON "subscriptions"("userId");
CREATE INDEX "credit_ledger_userId_idx" ON "credit_ledger"("userId");
CREATE UNIQUE INDEX "usage_events_idempotencyKey_key" ON "usage_events"("idempotencyKey");
CREATE INDEX "usage_events_userId_idx" ON "usage_events"("userId");

-- Ajouter les contraintes de clés étrangères
ALTER TABLE "credit_balances" ADD CONSTRAINT "credit_balances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "subscriptions"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "subscriptions"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "subscriptions"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
