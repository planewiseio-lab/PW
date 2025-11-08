import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCreditBalance, ensureUserInitialized } from "@/lib/credits";
import { prisma } from "@/lib/prisma";
import { Plan } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ensure user is initialized (creates subscription and credits if needed)
    await ensureUserInitialized(user.id);

    // Vérifier le plan de l'utilisateur
    const subscription = await prisma.subscriptions.findUnique({
      where: { userId: user.id },
      select: { plan: true, renewsAt: true },
    });

    // Si l'utilisateur est sur le plan FREE, retourner les crédits réels (50) avec la date de renouvellement
    if (subscription?.plan === Plan.FREE) {
      const credits = await getCreditBalance(user.id);

      return NextResponse.json({
        credits, // Les crédits réels du compte (50 par mois)
        isFreeUser: true,
        renewsAt: subscription.renewsAt,
      });
    }

    // Pour les autres plans, retourner le balance normal
    const credits = await getCreditBalance(user.id);

    return NextResponse.json({ credits, isFreeUser: false });
  } catch (error) {
    console.error("Error fetching credit balance:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
