import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUsageHistory, ensureUserInitialized } from "@/lib/credits";

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

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "100");
    const cursor = searchParams.get("cursor") || undefined;

    // Ensure user is initialized before fetching history
    try {
      await ensureUserInitialized(user.id);
    } catch (initError) {
      console.error(`[Credits History] Failed to ensure user initialization for ${user.id}:`, initError);
      // Continue anyway - user might already be initialized
    }

    const history = await getUsageHistory(user.id, limit, cursor);

    return NextResponse.json(history);
  } catch (error: any) {
    console.error("Error fetching usage history:", error);
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
