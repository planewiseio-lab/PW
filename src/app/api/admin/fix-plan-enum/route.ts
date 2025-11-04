import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
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

    console.log("Fixing Plan enum: adding BASIC (part 1)...");

    // PARTIE 1: Ajouter 'BASIC' à l'enum Plan
    // PostgreSQL nécessite que l'ajout d'une valeur enum soit dans une transaction séparée
    const sqlPart1 = `
      DO $$ 
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM pg_enum 
              WHERE enumlabel = 'BASIC' 
              AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'Plan')
          ) THEN
              ALTER TYPE "Plan" ADD VALUE 'BASIC';
          END IF;
      END $$;
    `;

    // Exécuter la partie 1
    const { data: data1, error: error1 } = await supabaseAdmin.rpc("exec", {
      sql: sqlPart1,
    });

    if (error1) {
      console.error("Error adding BASIC to Plan enum:", error1);
      return NextResponse.json(
        { error: error1.message, details: error1 },
        { status: 500 }
      );
    }

    // Attendre un peu pour que la transaction soit commitée
    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log("Updating subscriptions from BUSINESS to BASIC (part 2)...");

    // PARTIE 2: Mettre à jour les subscriptions
    const sqlPart2 = `
      UPDATE subscriptions 
      SET plan = 'BASIC'::"Plan"
      WHERE plan = 'BUSINESS'::"Plan";
    `;

    // Exécuter la partie 2
    const { data: data2, error: error2 } = await supabaseAdmin.rpc("exec", {
      sql: sqlPart2,
    });

    if (error2) {
      console.error("Error updating subscriptions:", error2);
      return NextResponse.json(
        { error: error2.message, details: error2 },
        { status: 500 }
      );
    }

    // Vérifier les valeurs actuelles de l'enum
    const checkSql = `
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'Plan')
      ORDER BY enumsortorder;
    `;

    const { data: enumValues, error: checkError } = await supabaseAdmin.rpc(
      "exec",
      { sql: checkSql }
    );

    return NextResponse.json({
      success: true,
      message:
        "Plan enum fixed successfully! BASIC has been added and BUSINESS subscriptions updated to BASIC.",
      enumValues: enumValues,
    });
  } catch (error: any) {
    console.error("Error fixing Plan enum:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

