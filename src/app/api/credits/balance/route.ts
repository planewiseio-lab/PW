import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCreditBalance } from "@/lib/credits";
import { prisma } from "@/lib/prisma";
import { Plan } from "@prisma/client";
import { getFreeUserUsage, FREE_USER_QUOTA_LIMIT, FREE_USER_AIRCRAFT_LOOKUP_LIMIT } from "@/lib/guestQuota";

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

    // Vérifier le plan de l'utilisateur
    const subscription = await prisma.subscriptions.findUnique({
      where: { userId: user.id },
      select: { plan: true },
    });

    // Si l'utilisateur est sur le plan FREE, retourner les quotas au lieu du balance
    if (subscription?.plan === Plan.FREE) {
      // Récupérer les quotas pour les requêtes générales et les lookups d'avions
      const generalUsage = await getFreeUserUsage(user.id, false);
      const aircraftLookupUsage = await getFreeUserUsage(user.id, true);

      return NextResponse.json({
        credits: 0, // Les utilisateurs Free n'ont pas de crédits
        isFreeUser: true,
        quotas: {
          general: {
            used: generalUsage.count,
            remaining: generalUsage.remaining,
            limit: FREE_USER_QUOTA_LIMIT,
            ttl: generalUsage.ttl,
          },
          aircraftLookup: {
            used: aircraftLookupUsage.count,
            remaining: aircraftLookupUsage.remaining,
            limit: FREE_USER_AIRCRAFT_LOOKUP_LIMIT,
            ttl: aircraftLookupUsage.ttl,
          },
        },
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
