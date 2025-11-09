import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { ensureUserInitialized } from "@/lib/credits";

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
    // Wrap in try-catch to prevent 500 errors if initialization fails
    try {
      await ensureUserInitialized(user.id);
    } catch (initError) {
      console.error(`[Subscription] Failed to ensure user initialization for ${user.id}:`, initError);
      // Continue anyway - user might already be initialized
    }

    // Récupérer l'abonnement depuis la base de données
    const subscription = await prisma.subscriptions.findUnique({
      where: { userId: user.id },
    });

    if (!subscription) {
      return NextResponse.json({ subscription: null });
    }

  return NextResponse.json({
    subscription: {
        plan: subscription.plan,
        status: subscription.status,
        renewsAt: subscription.renewsAt.toISOString(),
    },
  });
  } catch (error: any) {
    console.error("Error fetching subscription:", error);
    console.error("Error details:", {
      message: error?.message,
      code: error?.code,
      name: error?.name,
      stack: error?.stack,
    });
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: process.env.NODE_ENV === "development" ? error?.message : undefined,
      },
      { status: 500 }
    );
  }
}
