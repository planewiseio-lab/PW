import { createClient } from "@supabase/supabase-js";

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables");
  console.error(
    "Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createCreditTables() {
  try {
    console.log("Creating credit system tables...");

    // Create enums
    console.log("Creating enums...");
    await supabase.rpc("exec", {
      sql: `CREATE TYPE IF NOT EXISTS "Plan" AS ENUM ('FREE', 'PRO', 'BASIC');`,
    });

    await supabase.rpc("exec", {
      sql: `CREATE TYPE IF NOT EXISTS "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELED');`,
    });

    await supabase.rpc("exec", {
      sql: `CREATE TYPE IF NOT EXISTS "CreditReason" AS ENUM ('ACTION', 'MONTHLY_TOPUP', 'MANUAL_ADJUST', 'PURCHASE', 'REFUND', 'ADMIN_FIX');`,
    });

    await supabase.rpc("exec", {
      sql: `CREATE TYPE IF NOT EXISTS "ActionType" AS ENUM ('AIRCRAFT_LOOKUP', 'VIEW_FLIGHT_HISTORY', 'BROWSE_FLIGHT', 'BROWSE_AIRPORT', 'UNKNOWN');`,
    });

    // Create subscriptions table
    console.log("Creating subscriptions table...");
    await supabase.rpc("exec", {
      sql: `
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
      `,
    });

    // Create creditBalance table
    console.log("Creating creditBalance table...");
    await supabase.rpc("exec", {
      sql: `
        CREATE TABLE IF NOT EXISTS "creditBalance" (
          "userId" TEXT NOT NULL,
          "credits" INTEGER NOT NULL DEFAULT 0,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "creditBalance_pkey" PRIMARY KEY ("userId")
        );
      `,
    });

    // Create creditLedger table
    console.log("Creating creditLedger table...");
    await supabase.rpc("exec", {
      sql: `
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
      `,
    });

    // Create usageEvents table
    console.log("Creating usageEvents table...");
    await supabase.rpc("exec", {
      sql: `
        CREATE TABLE IF NOT EXISTS "usageEvents" (
          "id" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "actionType" "ActionType" NOT NULL,
          "idempotencyKey" TEXT NOT NULL,
          "cost" INTEGER NOT NULL DEFAULT 1,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "usageEvents_pkey" PRIMARY KEY ("id")
        );
      `,
    });

    // Create indexes
    console.log("Creating indexes...");
    await supabase.rpc("exec", {
      sql: `CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_userId_key" ON "subscriptions"("userId");`,
    });

    await supabase.rpc("exec", {
      sql: `CREATE INDEX IF NOT EXISTS "creditLedger_userId_idx" ON "creditLedger"("userId");`,
    });

    await supabase.rpc("exec", {
      sql: `CREATE UNIQUE INDEX IF NOT EXISTS "usageEvents_idempotencyKey_key" ON "usageEvents"("idempotencyKey");`,
    });

    await supabase.rpc("exec", {
      sql: `CREATE INDEX IF NOT EXISTS "usageEvents_userId_idx" ON "usageEvents"("userId");`,
    });

    console.log("✅ Credit system tables created successfully!");
    console.log("Tables created:");
    console.log("- subscriptions");
    console.log("- creditBalance");
    console.log("- creditLedger");
    console.log("- usageEvents");
  } catch (error) {
    console.error("Error creating tables:", error);
  }
}

createCreditTables();
