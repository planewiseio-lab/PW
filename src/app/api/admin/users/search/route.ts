import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Vérifier si l'utilisateur est admin
    const isAdmin =
      user.user_metadata?.role === "admin" ||
      user.app_metadata?.role === "admin";

    if (!isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Récupérer le paramètre de recherche
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query) {
      return NextResponse.json(
        { error: "Query parameter 'q' is required" },
        { status: 400 }
      );
    }

    // Rechercher les utilisateurs par email ou ID
    const { data: users, error: searchError } =
      await supabaseAdmin.auth.admin.listUsers();

    if (searchError) {
      console.error("[Admin User Search] Error:", searchError);
      return NextResponse.json({ error: searchError.message }, { status: 500 });
    }

    // Filtrer les utilisateurs selon la requête
    const filteredUsers = users.users.filter((u) => {
      const email = u.email?.toLowerCase() || "";
      const userId = u.id.toLowerCase();
      const searchTerm = query.toLowerCase();

      return email.includes(searchTerm) || userId.includes(searchTerm);
    });

    // Limiter à 10 résultats pour éviter des réponses trop lourdes
    const limitedResults = filteredUsers.slice(0, 10);

    // Récupérer les informations de crédits pour chaque utilisateur
    const usersWithCredits = await Promise.all(
      limitedResults.map(async (user) => {
        try {
          // Récupérer le solde de crédits
          const creditBalance = await prisma.credit_balances.findUnique({
            where: { userId: user.id },
          });

          // Récupérer l'abonnement
          const subscription = await prisma.user_subscriptions.findFirst({
            where: { user_id: user.id },
          });

          return {
            id: user.id,
            email: user.email,
            created_at: user.created_at,
            last_sign_in_at: user.last_sign_in_at,
            email_confirmed_at: user.email_confirmed_at,
            credits: creditBalance?.credits || 0,
            plan: subscription?.plan || "free",
          };
        } catch (error) {
          console.error(`Error fetching credits for user ${user.id}:`, error);
          return {
            id: user.id,
            email: user.email,
            created_at: user.created_at,
            last_sign_in_at: user.last_sign_in_at,
            email_confirmed_at: user.email_confirmed_at,
            credits: 0,
            plan: "unknown",
          };
        }
      })
    );

    return NextResponse.json({
      users: usersWithCredits,
      total: filteredUsers.length,
      limited: limitedResults.length,
    });
  } catch (error: any) {
    console.error("[Admin User Search] Exception:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
