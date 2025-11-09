import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCreditBalance, ensureUserInitialized } from "@/lib/credits";
import { prisma } from "@/lib/prisma";
import { Plan } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    // Check Prisma connection
    if (!prisma) {
      console.error("[Credits Balance] Prisma client is not initialized");
      return NextResponse.json(
        { error: "Database connection error" },
        { status: 500 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ensure user is initialized (creates subscription and credits if needed)
    // Wrap in try-catch to prevent 500 errors if initialization fails
    try {
      await ensureUserInitialized(user.id);
    } catch (initError: any) {
      console.error(
        `[Credits Balance] Failed to ensure user initialization for ${user.id}:`,
        initError
      );
      console.error("[Credits Balance] Init error details:", {
        message: initError?.message,
        code: initError?.code,
        name: initError?.name,
      });
      // Continue anyway - user might already be initialized
    }

    // Vérifier le plan de l'utilisateur
    let subscription;
    try {
      subscription = await prisma.subscriptions.findUnique({
        where: { userId: user.id },
        select: { plan: true, renewsAt: true },
      });
    } catch (dbError: any) {
      console.error("[Credits Balance] Database error fetching subscription:", dbError);
      console.error("[Credits Balance] DB error details:", {
        message: dbError?.message,
        code: dbError?.code,
        name: dbError?.name,
      });
      throw dbError;
    }

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
  } catch (error: any) {
    console.error("Error fetching credit balance:", error);
    console.error("Error details:", {
      message: error?.message,
      code: error?.code,
      name: error?.name,
      stack: error?.stack,
    });
    return NextResponse.json(
      {
        error: "Internal server error",
        message:
          process.env.NODE_ENV === "development" ? error?.message : undefined,
      },
      { status: 500 }
    );
  }
}
