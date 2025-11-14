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

    // Créer les tables une par une avec des requêtes simples
    const results = [];

    try {
      // 1. Créer les enums
      console.log("Creating enums...");

      // Plan enum
      const { error: planError } = await supabaseAdmin
        .from("pg_type")
        .select("*")
        .eq("typname", "Plan");

      if (planError || !planError) {
        const { error } = await supabaseAdmin.rpc("create_enum", {
          enum_name: "Plan",
          enum_values: ["FREE", "PRO", "BASIC"],
        });
        if (error) console.log("Plan enum might already exist:", error.message);
      }

      // SubscriptionStatus enum
      const { error: statusError } = await supabaseAdmin.rpc("create_enum", {
        enum_name: "SubscriptionStatus",
        enum_values: ["ACTIVE", "PAST_DUE", "CANCELED"],
      });
      if (statusError)
        console.log(
          "SubscriptionStatus enum might already exist:",
          statusError.message
        );

      // CreditReason enum
      const { error: reasonError } = await supabaseAdmin.rpc("create_enum", {
        enum_name: "CreditReason",
        enum_values: [
          "ACTION",
          "MONTHLY_TOPUP",
          "MANUAL_ADJUST",
          "PURCHASE",
          "REFUND",
          "ADMIN_FIX",
        ],
      });
      if (reasonError)
        console.log(
          "CreditReason enum might already exist:",
          reasonError.message
        );

      // ActionType enum
      const { error: actionError } = await supabaseAdmin.rpc("create_enum", {
        enum_name: "ActionType",
        enum_values: [
          "AIRCRAFT_LOOKUP",
          "VIEW_FLIGHT_HISTORY",
          "BROWSE_FLIGHT",
          "BROWSE_AIRPORT",
          "UNKNOWN",
        ],
      });
      if (actionError)
        console.log(
          "ActionType enum might already exist:",
          actionError.message
        );

      results.push("Enums created");
    } catch (error) {
      console.log("Enum creation error (might already exist):", error);
      results.push("Enums might already exist");
    }

    // 2. Créer les tables
    console.log("Creating tables...");

    // Table subscriptions
    const { error: subError } = await supabaseAdmin.rpc(
      "create_table_if_not_exists",
      {
        table_name: "subscriptions",
        table_sql: `
        CREATE TABLE IF NOT EXISTS "subscriptions" (
          "id" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "plan" TEXT NOT NULL DEFAULT 'FREE',
          "status" TEXT NOT NULL DEFAULT 'ACTIVE',
          "renewsAt" TIMESTAMP(3) NOT NULL,
          "stripeCustomerId" TEXT,
          "stripeSubId" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
        );
      `,
      }
    );
    if (subError) console.log("Subscriptions table error:", subError.message);
    else results.push("Subscriptions table created");

    // Table creditBalance
    const { error: balanceError } = await supabaseAdmin.rpc(
      "create_table_if_not_exists",
      {
        table_name: "creditBalance",
        table_sql: `
        CREATE TABLE IF NOT EXISTS "creditBalance" (
          "userId" TEXT NOT NULL,
          "credits" INTEGER NOT NULL DEFAULT 0,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "creditBalance_pkey" PRIMARY KEY ("userId")
        );
      `,
      }
    );
    if (balanceError)
      console.log("CreditBalance table error:", balanceError.message);
    else results.push("CreditBalance table created");

    // Table creditLedger
    const { error: ledgerError } = await supabaseAdmin.rpc(
      "create_table_if_not_exists",
      {
        table_name: "creditLedger",
        table_sql: `
        CREATE TABLE IF NOT EXISTS "creditLedger" (
          "id" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "delta" INTEGER NOT NULL,
          "reason" TEXT NOT NULL,
          "actionType" TEXT,
          "refId" TEXT,
          "metadata" JSONB,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "creditLedger_pkey" PRIMARY KEY ("id")
        );
      `,
      }
    );
    if (ledgerError)
      console.log("CreditLedger table error:", ledgerError.message);
    else results.push("CreditLedger table created");

    // Table usageEvents
    const { error: eventsError } = await supabaseAdmin.rpc(
      "create_table_if_not_exists",
      {
        table_name: "usageEvents",
        table_sql: `
        CREATE TABLE IF NOT EXISTS "usageEvents" (
          "id" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "actionType" TEXT NOT NULL,
          "idempotencyKey" TEXT NOT NULL,
          "cost" INTEGER NOT NULL DEFAULT 1,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "usageEvents_pkey" PRIMARY KEY ("id")
        );
      `,
      }
    );
    if (eventsError)
      console.log("UsageEvents table error:", eventsError.message);
    else results.push("UsageEvents table created");

    return NextResponse.json({
      success: true,
      message: "Credit system setup completed!",
      results: results,
      note: "Some operations might have failed if tables already exist. Check the console for details.",
    });
  } catch (error: any) {
    console.error("Error creating tables:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
