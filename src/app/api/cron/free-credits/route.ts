import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  refreshFreeCreditsDaily,
  checkFreeCreditsStatus,
  forceRefreshFreeCredits,
} from "@/lib/cron/refreshFreeCredits";
import { monitorCronJobs } from "@/lib/cron/scheduler";
import { logCronExecution } from "@/lib/cron/logCronExecution";

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  // Log de démarrage très visible pour Vercel
  console.log("=".repeat(80));
  console.log(`[FREE-CREDITS-CRON] 🚀 STARTING at ${timestamp}`);
  console.log(`[FREE-CREDITS-CRON] 📍 Path: /api/cron/free-credits`);
  console.log(`[FREE-CREDITS-CRON] 🌍 Environment: ${process.env.NODE_ENV || "unknown"}`);
  console.log(`[FREE-CREDITS-CRON] 🔐 Vercel: ${process.env.VERCEL ? "YES" : "NO"}`);
  console.log("=".repeat(80));

  try {
    // Vérifier si c'est un appel Vercel Cron (avec CRON_SECRET)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    const cronSecretHeader = request.headers.get("x-cron-secret");
    const isDevelopment = process.env.NODE_ENV === "development" || !process.env.VERCEL;
    
    // Vérifier si c'est un appel depuis Vercel Cron
    const isVercelCron = 
      (cronSecret && (
        authHeader === `Bearer ${cronSecret}` ||
        cronSecretHeader === cronSecret
      )) || isDevelopment;

    if (isVercelCron) {
      // Appel depuis Vercel Cron - exécuter directement
      console.log("[FREE-CREDITS-CRON] ✅ Authenticated as Vercel Cron");
      
      // Enregistrer le début de l'exécution
      const logEntry = await logCronExecution({
        jobName: "free-credits",
        status: "running",
        metadata: { source: "vercel-cron", timestamp },
      });
      
      try {
        const result = await refreshFreeCreditsDaily();
        const duration = Date.now() - startTime;
        
        // Mettre à jour le log avec le résultat
        if (logEntry) {
          const { updateCronLog } = await import("@/lib/cron/logCronExecution");
          await updateCronLog(logEntry.id, {
            status: "success",
            result,
            duration,
          });
        } else {
          // Si la création a échoué, créer un nouveau log
          await logCronExecution({
            jobName: "free-credits",
            status: "success",
            result,
            duration,
            metadata: { source: "vercel-cron", timestamp },
          });
        }
        
        console.log("=".repeat(80));
        console.log(`[FREE-CREDITS-CRON] ✅ COMPLETED in ${duration}ms`);
        console.log(`[FREE-CREDITS-CRON] 📊 Result:`, JSON.stringify(result, null, 2));
        console.log("=".repeat(80));
        
        return NextResponse.json({
          success: true,
          timestamp,
          duration: `${duration}ms`,
          result,
        });
      } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        
        // Mettre à jour le log avec l'erreur
        if (logEntry) {
          const { updateCronLog } = await import("@/lib/cron/logCronExecution");
          await updateCronLog(logEntry.id, {
            status: "error",
            error: errorMessage,
            duration,
          });
        } else {
          // Si la création a échoué, créer un nouveau log
          await logCronExecution({
            jobName: "free-credits",
            status: "error",
            error: errorMessage,
            duration,
            metadata: { source: "vercel-cron", timestamp },
          });
        }
        
        throw error; // Re-throw pour le catch global
      }
    }

    // Sinon, vérifier l'authentification utilisateur (pour les appels manuels admin)
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      console.log("[FREE-CREDITS-CRON] ❌ Unauthorized - no user");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Vérifier si l'utilisateur est admin
    const isAdmin =
      user.user_metadata?.role === "admin" ||
      user.app_metadata?.role === "admin";

    if (!isAdmin) {
      console.log("[FREE-CREDITS-CRON] ❌ Forbidden - not admin");
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    console.log(`[FREE-CREDITS-CRON] ✅ Authenticated as admin: ${user.id}`);
    const body = await request.json().catch(() => ({}));
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

    const duration = Date.now() - startTime;
    console.log("=".repeat(80));
    console.log(`[FREE-CREDITS-CRON] ✅ COMPLETED in ${duration}ms`);
    console.log(`[FREE-CREDITS-CRON] 📊 Action: ${action}`);
    console.log("=".repeat(80));
    
    return NextResponse.json({
      success: true,
      action,
      timestamp,
      duration: `${duration}ms`,
      result,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("=".repeat(80));
    console.error(`[FREE-CREDITS-CRON] 💥 ERROR after ${duration}ms`);
    console.error(`[FREE-CREDITS-CRON] Error:`, error);
    console.error("=".repeat(80));
    
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp,
        duration: `${duration}ms`,
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
