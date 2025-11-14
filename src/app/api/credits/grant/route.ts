import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { grantCredits, AdminOnlyError } from "@/lib/credits";

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

    // Check if user is admin (you can implement your own admin check)
    const isAdmin =
      user.user_metadata?.role === "admin" ||
      user.app_metadata?.role === "admin";

    if (!isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId, amount, reason, metadata } = body;

    if (!userId || !amount || !reason) {
      return NextResponse.json(
        { error: "Missing required fields: userId, amount, reason" },
        { status: 400 }
      );
    }

    if (!["MONTHLY_TOPUP", "MANUAL_ADJUST", "PURCHASE"].includes(reason)) {
      return NextResponse.json({ error: "Invalid reason" }, { status: 400 });
    }

    await grantCredits(userId, amount, reason, metadata);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AdminOnlyError) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    console.error("Error granting credits:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
