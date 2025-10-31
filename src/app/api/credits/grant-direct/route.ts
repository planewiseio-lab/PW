import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Plan, SubscriptionStatus } from "@prisma/client";
import { randomUUID } from "crypto";

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

    console.log(`[Admin] Granting ${amount} credits to user ${userId}`);

    // 1. S'assurer que l'abonnement existe (pour éviter l'erreur FK)
    // Si l'abonnement existe déjà, NE PAS le modifier (préserver le plan et le statut)
    let subscription = await prisma.subscriptions.findUnique({
      where: { userId },
    });

    if (!subscription) {
      // Si l'utilisateur n'a pas d'abonnement, en créer un avec FREE par défaut
      subscription = await prisma.subscriptions.create({
        data: {
          id: randomUUID(),
          userId: userId,
          plan: Plan.FREE,
          status: SubscriptionStatus.ACTIVE,
          renewsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Dans 30 jours
        },
      });
      console.log(`[Admin] Created default FREE subscription for user ${userId}`);
    } else {
      console.log(
        `[Admin] Preserving existing subscription: plan=${subscription.plan}, status=${subscription.status}`
      );
    }

    // 2. Utiliser la fonction grantCredits de Prisma pour gérer correctement les crédits
    // Cela garantit la cohérence des données et évite les problèmes de FK
    const { grantCredits } = await import("@/lib/credits");

    await grantCredits(
      userId,
      amount,
      (reason as "MONTHLY_TOPUP" | "MANUAL_ADJUST" | "PURCHASE") || "MANUAL_ADJUST",
      {
        note,
        adminAction: true,
        adminId: user.id,
        source: "admin_credit_management",
      }
    );

    // 3. Récupérer le nouveau solde pour la réponse
    const creditBalance = await prisma.credit_balances.findUnique({
      where: { userId },
    });

    console.log(
      `[Admin] Successfully granted ${amount} credits to user ${userId}. New balance: ${creditBalance?.credits ?? 0}`
    );

    return NextResponse.json({
      success: true,
      message: `Successfully granted ${amount} credits to user ${userId}`,
      newBalance: creditBalance?.credits ?? 0,
      subscription: {
        plan: subscription.plan,
        status: subscription.status,
      },
    });
  } catch (error: any) {
    console.error("Error granting credits:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
