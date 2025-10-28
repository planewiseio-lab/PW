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

    // Utiliser l'API REST de Supabase pour créer les tables
    const results = [];

    try {
      // Créer les tables via l'API REST
      const tables = [
        {
          name: "subscriptions",
          sql: `CREATE TABLE IF NOT EXISTS "subscriptions" (
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
          );`,
        },
        {
          name: "creditBalance",
          sql: `CREATE TABLE IF NOT EXISTS "creditBalance" (
            "userId" TEXT NOT NULL,
            "credits" INTEGER NOT NULL DEFAULT 0,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "creditBalance_pkey" PRIMARY KEY ("userId")
          );`,
        },
        {
          name: "creditLedger",
          sql: `CREATE TABLE IF NOT EXISTS "creditLedger" (
            "id" TEXT NOT NULL,
            "userId" TEXT NOT NULL,
            "delta" INTEGER NOT NULL,
            "reason" TEXT NOT NULL,
            "actionType" TEXT,
            "refId" TEXT,
            "metadata" JSONB,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "creditLedger_pkey" PRIMARY KEY ("id")
          );`,
        },
        {
          name: "usageEvents",
          sql: `CREATE TABLE IF NOT EXISTS "usageEvents" (
            "id" TEXT NOT NULL,
            "userId" TEXT NOT NULL,
            "actionType" TEXT NOT NULL,
            "idempotencyKey" TEXT NOT NULL,
            "cost" INTEGER NOT NULL DEFAULT 1,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "usageEvents_pkey" PRIMARY KEY ("id")
          );`,
        },
      ];

      // Essayer de créer chaque table
      for (const table of tables) {
        try {
          // Utiliser une requête SQL directe via l'API REST
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
              },
              body: JSON.stringify({ sql: table.sql }),
            }
          );

          if (response.ok) {
            results.push(`${table.name} table created successfully`);
          } else {
            const error = await response.text();
            results.push(`${table.name} table creation failed: ${error}`);
          }
        } catch (err) {
          results.push(`${table.name} table creation error: ${err}`);
        }
      }

      // Créer les index
      const indexes = [
        `CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_userId_key" ON "subscriptions"("userId");`,
        `CREATE INDEX IF NOT EXISTS "creditLedger_userId_idx" ON "creditLedger"("userId");`,
        `CREATE UNIQUE INDEX IF NOT EXISTS "usageEvents_idempotencyKey_key" ON "usageEvents"("idempotencyKey");`,
        `CREATE INDEX IF NOT EXISTS "usageEvents_userId_idx" ON "usageEvents"("userId");`,
      ];

      for (const indexSql of indexes) {
        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
              },
              body: JSON.stringify({ sql: indexSql }),
            }
          );

          if (response.ok) {
            results.push("Index created successfully");
          } else {
            const error = await response.text();
            results.push(`Index creation failed: ${error}`);
          }
        } catch (err) {
          results.push(`Index creation error: ${err}`);
        }
      }
    } catch (error) {
      console.error("Error creating tables:", error);
      results.push(`General error: ${error}`);
    }

    return NextResponse.json({
      success: true,
      message: "Credit system tables creation attempted!",
      results: results,
      note: "Check the results above. Some errors are expected if tables already exist.",
    });
  } catch (error: any) {
    console.error("Error creating tables:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
