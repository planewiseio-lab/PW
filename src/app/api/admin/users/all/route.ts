import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import { Plan } from "@prisma/client";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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

    // Récupérer les paramètres de requête pour les filtres et pagination
    const { searchParams } = new URL(request.url);
    const planFilter = searchParams.get("plan"); // FREE, BASIC, PRO
    const minCredits = searchParams.get("minCredits")
      ? parseInt(searchParams.get("minCredits")!, 10)
      : null;
    const maxCredits = searchParams.get("maxCredits")
      ? parseInt(searchParams.get("maxCredits")!, 10)
      : null;
    const page = searchParams.get("page")
      ? parseInt(searchParams.get("page")!, 10)
      : 1;
    const pageSize = 10;

    // Construire le where clause pour Prisma
    const where: any = {};

    // Filtrer par plan
    if (planFilter) {
      if (planFilter === "FREE") {
        where.plan = Plan.FREE;
      } else if (planFilter === "BASIC") {
        where.plan = Plan.BASIC; // BASIC plan
      } else if (planFilter === "PRO") {
        where.plan = Plan.PRO;
      }
    }

    // Récupérer toutes les subscriptions avec les filtres
    const subscriptions = await prisma.subscriptions.findMany({
      where,
      orderBy: { updatedAt: "desc" },
    });

    // Récupérer les soldes de crédits pour tous les utilisateurs
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

    // Récupérer tous les utilisateurs Supabase pour les emails
    const { data: supabaseUsers, error: supabaseError } =
      await supabaseAdmin.auth.admin.listUsers();

    // Créer une map userId -> email et userId -> exists pour un accès rapide
    const emailMap = new Map<string, string>();
    const userExistsMap = new Map<string, boolean>();
    if (!supabaseError && supabaseUsers?.users) {
      supabaseUsers.users.forEach((user) => {
        userExistsMap.set(user.id, true);
        if (user.email) {
          emailMap.set(user.id, user.email);
        }
      });
    }

    // Combiner les données et appliquer le filtre de crédits
    let usersWithCredits = subscriptions.map((subscription) => {
      const credits = creditsMap.get(subscription.userId) ?? 0;
      const userExists = userExistsMap.get(subscription.userId) ?? false;
      return {
        userId: subscription.userId,
        email: emailMap.get(subscription.userId) || null,
        userExists, // Indique si l'utilisateur existe dans Supabase Auth
        plan: subscription.plan,
        status: subscription.status,
        credits,
        renewsAt: subscription.renewsAt.toISOString(),
        paddleSubscriptionId: subscription.paddleSubscriptionId,
        paddleTransactionId: subscription.paddleTransactionId,
        updatedAt: subscription.updatedAt.toISOString(),
      };
    });

    // Filtrer par crédits si spécifié
    if (minCredits !== null) {
      usersWithCredits = usersWithCredits.filter(
        (user) => user.credits >= minCredits
      );
    }
    if (maxCredits !== null) {
      usersWithCredits = usersWithCredits.filter(
        (user) => user.credits <= maxCredits
      );
    }

    // Trier par crédits décroissant pour un meilleur aperçu
    usersWithCredits.sort((a, b) => b.credits - a.credits);

    // Pagination
    const totalUsers = usersWithCredits.length;
    const totalPages = Math.ceil(totalUsers / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedUsers = usersWithCredits.slice(startIndex, endIndex);

    return NextResponse.json({
      users: paginatedUsers,
      total: totalUsers,
      page,
      pageSize,
      totalPages,
    });
  } catch (error) {
    console.error("Error fetching all users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

