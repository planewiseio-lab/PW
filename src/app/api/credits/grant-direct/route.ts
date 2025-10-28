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

    const { userId, amount, reason, note } = await request.json();

    if (!userId || !amount) {
      return NextResponse.json(
        { error: "User ID and amount are required" },
        { status: 400 }
      );
    }

    console.log(`Granting ${amount} credits to user ${userId}`);

    // 1. S'assurer que l'abonnement existe (pour éviter l'erreur FK)
    const { error: subscriptionError } = await supabaseAdmin
      .from("subscriptions")
      .upsert(
        {
          id: crypto.randomUUID(),
          userId: userId,
          plan: "FREE",
          status: "ACTIVE",
          renewsAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          onConflict: "userId",
          ignoreDuplicates: false,
        }
      );

    if (subscriptionError) {
      console.error("Error creating subscription:", subscriptionError);
      return NextResponse.json(
        { error: subscriptionError.message },
        { status: 500 }
      );
    }

    // 2. Créer l'entrée dans le ledger
    const { data: ledgerData, error: ledgerError } = await supabaseAdmin
      .from("credit_ledger")
      .insert({
        id: crypto.randomUUID(),
        userId: userId,
        delta: amount,
        reason: reason || "MANUAL_ADJUST",
        metadata: { note, adminAction: true },
        createdAt: new Date().toISOString(),
      });

    if (ledgerError) {
      console.error("Error creating ledger entry:", ledgerError);
      return NextResponse.json({ error: ledgerError.message }, { status: 500 });
    }

    // 3. Mettre à jour le solde de crédits (incrémenter au lieu de remplacer)
    const { data: currentBalance } = await supabaseAdmin
      .from("credit_balances")
      .select("credits")
      .eq("userId", userId)
      .single();

    const currentCredits = currentBalance?.credits ?? 0;
    const newCredits = currentCredits + amount;

    const { data: balanceData, error: balanceError } = await supabaseAdmin
      .from("credit_balances")
      .upsert(
        {
          userId: userId,
          credits: newCredits,
          updatedAt: new Date().toISOString(),
        },
        {
          onConflict: "userId",
          ignoreDuplicates: false,
        }
      );

    if (balanceError) {
      console.error("Error updating balance:", balanceError);
      return NextResponse.json(
        { error: balanceError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully granted ${amount} credits to user ${userId}`,
      ledgerData,
      balanceData,
    });
  } catch (error: any) {
    console.error("Error granting credits:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
