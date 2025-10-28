import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  try {
    // Vérifier l'authentification admin
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin =
      user.user_metadata?.role === "admin" ||
      user.app_metadata?.role === "admin";

    if (!isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    console.log("Creating credit system tables...");

    // Utiliser des requêtes SQL directes
    const sqlCommands = [
      // Créer les enums
      `DO $$ BEGIN
        CREATE TYPE "Plan" AS ENUM ('FREE', 'PRO', 'BUSINESS');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;`,

      `DO $$ BEGIN
        CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;`,

      `DO $$ BEGIN
        CREATE TYPE "CreditReason" AS ENUM ('ACTION', 'MONTHLY_TOPUP', 'MANUAL_ADJUST', 'PURCHASE', 'REFUND', 'ADMIN_FIX');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;`,

      `DO $$ BEGIN
        CREATE TYPE "ActionType" AS ENUM ('AIRCRAFT_LOOKUP', 'VIEW_FLIGHT_HISTORY', 'BROWSE_FLIGHT', 'BROWSE_AIRPORT', 'UNKNOWN');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;`,

      // Créer les tables
      `CREATE TABLE IF NOT EXISTS "subscriptions" (
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
      );`,

      `CREATE TABLE IF NOT EXISTS "creditBalance" (
        "userId" TEXT NOT NULL,
        "credits" INTEGER NOT NULL DEFAULT 0,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "creditBalance_pkey" PRIMARY KEY ("userId")
      );`,

      `CREATE TABLE IF NOT EXISTS "creditLedger" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "delta" INTEGER NOT NULL,
        "reason" "CreditReason" NOT NULL,
        "actionType" "ActionType",
        "refId" TEXT,
        "metadata" JSONB,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "creditLedger_pkey" PRIMARY KEY ("id")
      );`,

      `CREATE TABLE IF NOT EXISTS "usageEvents" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "actionType" "ActionType" NOT NULL,
        "idempotencyKey" TEXT NOT NULL,
        "cost" INTEGER NOT NULL DEFAULT 1,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "usageEvents_pkey" PRIMARY KEY ("id")
      );`,

      // Créer les index
      `CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_userId_key" ON "subscriptions"("userId");`,
      `CREATE INDEX IF NOT EXISTS "creditLedger_userId_idx" ON "creditLedger"("userId");`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "usageEvents_idempotencyKey_key" ON "usageEvents"("idempotencyKey");`,
      `CREATE INDEX IF NOT EXISTS "usageEvents_userId_idx" ON "usageEvents"("userId");`,
    ];

    const results = [];

    for (const sql of sqlCommands) {
      try {
        const { data, error } = await supabaseAdmin.rpc("exec_sql", { sql });
        if (error) {
          console.log("SQL Error (might be expected):", error.message);
          results.push(`SQL executed with warning: ${error.message}`);
        } else {
          results.push("SQL executed successfully");
        }
      } catch (err) {
        console.log("SQL Exception:", err);
        results.push(`SQL executed with exception: ${err}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Credit system tables creation attempted!",
      results: results,
      note: "Check console logs for detailed results. Some errors are expected if tables already exist.",
    });
  } catch (error: any) {
    console.error("Error creating tables:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
