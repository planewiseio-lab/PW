import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  refreshFreeCreditsDaily,
  checkFreeCreditsStatus,
  forceRefreshFreeCredits,
} from "@/lib/cron/refreshFreeCredits";
import { monitorCronJobs } from "@/lib/cron/scheduler";

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

    const body = await request.json();
    const { action = "refresh", force = false } = body;

    let result;

    switch (action) {
      case "refresh":
        if (force) {
          result = await forceRefreshFreeCredits();
        } else {
          result = await refreshFreeCreditsDaily();
        }
        break;

      case "status":
        result = await checkFreeCreditsStatus();
        break;

      case "monitor":
        result = await monitorCronJobs();
        break;

      default:
        return NextResponse.json(
          { error: "Invalid action. Use 'refresh', 'status', or 'monitor'" },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      action,
      timestamp: new Date().toISOString(),
      result,
    });
  } catch (error) {
    console.error("Error in FREE credits cron API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

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

    // GET pour vérifier le statut
    const result = await checkFreeCreditsStatus();
    const monitor = await monitorCronJobs();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      status: result,
      monitor,
    });
  } catch (error) {
    console.error("Error checking FREE credits status:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
