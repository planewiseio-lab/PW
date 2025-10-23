import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runCreditTopUpCron } from "@/lib/cron/creditTopUp";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const isAdmin =
      user.user_metadata?.role === "admin" ||
      user.app_metadata?.role === "admin";

    if (!isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Run the credit top-up process
    const results = await runCreditTopUpCron();

    return NextResponse.json({
      success: true,
      message: "Credit top-up process completed",
      results,
    });
  } catch (error) {
    console.error("Error running credit top-up:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
