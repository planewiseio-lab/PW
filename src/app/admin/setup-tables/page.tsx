"use client";

import { useState } from "react";

export default function SetupTablesPage() {
  const [copied, setCopied] = useState(false);

  const sqlScript = `-- ========================================
-- SCRIPT SQL POUR CRÉER LES TABLES DE CRÉDIT
-- ========================================
-- Copiez et collez ce script dans l'éditeur SQL de Supabase
-- puis cliquez sur "Run" pour l'exécuter

-- 1. Créer les enums
DO $$ BEGIN
  CREATE TYPE "Plan" AS ENUM ('FREE', 'PRO', 'BASIC');
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

-- ========================================
-- FIN DU SCRIPT
-- ========================================`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(sqlScript);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  return (
    <div className="min-h-screen bg-white py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            🚀 Setup Credit Tables
          </h1>
          <p className="text-gray-600 mt-2">
            Create the credit system tables in Supabase
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              📋 Instructions
            </h2>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <ol className="list-decimal list-inside text-gray-700 space-y-2">
                <li>
                  <strong>Go to your Supabase dashboard</strong>
                </li>
                <li>
                  <strong>Navigate to the SQL Editor</strong> (left sidebar)
                </li>
                <li>
                  <strong>Copy the SQL script below</strong> (click "Copy
                  Script")
                </li>
                <li>
                  <strong>Paste it into the SQL editor</strong>
                </li>
                <li>
                  <strong>Click "Run"</strong> to execute the script
                </li>
                <li>
                  <strong>Return to the admin credits page</strong> to test
                </li>
              </ol>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-medium text-gray-900">
                📄 SQL Script
              </h3>
              <button
                onClick={copyToClipboard}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {copied ? "✅ Copied!" : "📋 Copy Script"}
              </button>
            </div>
            <pre className="bg-gray-100 border border-gray-300 rounded-lg p-4 overflow-x-auto text-sm max-h-96">
              <code>{sqlScript}</code>
            </pre>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-medium text-green-800 mb-2">
              ✅ What this script creates:
            </h4>
            <ul className="list-disc list-inside text-green-700 space-y-1">
              <li>
                <strong>4 Enums:</strong> Plan, SubscriptionStatus,
                CreditReason, ActionType
              </li>
              <li>
                <strong>4 Tables:</strong> subscriptions, creditBalance,
                creditLedger, usageEvents
              </li>
              <li>
                <strong>4 Indexes:</strong> for better performance
              </li>
              <li>
                <strong>Safe to run:</strong> Uses IF NOT EXISTS
              </li>
            </ul>
          </div>

          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-yellow-800 mb-2">
              ⚠️ Important Notes:
            </h4>
            <ul className="list-disc list-inside text-yellow-700 space-y-1">
              <li>This script is safe to run multiple times</li>
              <li>It won't overwrite existing data</li>
              <li>Make sure you're in the correct Supabase project</li>
              <li>After running, test the admin credits page</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
