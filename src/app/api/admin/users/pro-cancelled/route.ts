import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import { Plan, SubscriptionStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Vérifier si l'utilisateur est admin
    const isAdmin =
      user.user_metadata?.role === "admin" ||
      user.app_metadata?.role === "admin";

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Récupérer tous les utilisateurs avec plan PRO ou CANCELED
    const subscriptions = await prisma.subscriptions.findMany({
      where: {
        OR: [
          { plan: Plan.PRO },
          { plan: Plan.BUSINESS },
          { status: SubscriptionStatus.CANCELED },
        ],
      },
      orderBy: { updatedAt: "desc" },
    });

    // Récupérer les solde de crédits pour ces utilisateurs
    const userIds = subscriptions.map((sub) => sub.userId);
    const creditBalances = await prisma.credit_balances.findMany({
      where: {
        userId: { in: userIds },
      },
    });

    // Créer une map pour un accès rapide aux crédits
    const creditsMap = new Map(
      creditBalances.map((balance) => [balance.userId, balance.credits])
    );

    // Récupérer tous les utilisateurs Supabase une seule fois pour les emails
    const { data: supabaseUsers, error: supabaseError } =
      await supabaseAdmin.auth.admin.listUsers();

    // Créer une map userId -> email pour un accès rapide
    const emailMap = new Map<string, string>();
    if (!supabaseError && supabaseUsers?.users) {
      supabaseUsers.users.forEach((user) => {
        if (user.email) {
          emailMap.set(user.id, user.email);
        }
      });
    }

    // Combiner les données
    const usersWithCredits = subscriptions.map((subscription) => {
      return {
        userId: subscription.userId,
        email: emailMap.get(subscription.userId) || null,
        plan: subscription.plan,
        status: subscription.status,
        credits: creditsMap.get(subscription.userId) ?? 0,
        renewsAt: subscription.renewsAt.toISOString(),
        stripeCustomerId: subscription.stripeCustomerId,
        stripeSubId: subscription.stripeSubId,
        updatedAt: subscription.updatedAt.toISOString(),
      };
    });

    return NextResponse.json({ users: usersWithCredits });
  } catch (error) {
    console.error("Error fetching PRO/CANCELED users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

