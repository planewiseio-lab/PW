import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  refreshFreeCreditsDaily,
  checkFreeCreditsStatus,
  forceRefreshFreeCredits,
} from "@/lib/cron/refreshFreeCredits";
import { monitorCronJobs } from "@/lib/cron/scheduler";
import { logCronExecution } from "@/lib/cron/logCronExecution";

// Fonction partagée pour gérer les appels cron (GET ou POST)
async function handleCronRequest(request: NextRequest) {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  // Log de démarrage très visible pour Vercel
  console.log("=".repeat(80));
  console.log(`[FREE-CREDITS-CRON] 🚀 STARTING at ${timestamp}`);
  console.log(`[FREE-CREDITS-CRON] 📍 Path: /api/cron/free-credits`);
  console.log(`[FREE-CREDITS-CRON] 🌍 Environment: ${process.env.NODE_ENV || "unknown"}`);
  console.log(`[FREE-CREDITS-CRON] 🔐 Vercel: ${process.env.VERCEL ? "YES" : "NO"}`);
  
  // Log tous les headers pour déboguer
  const userAgent = request.headers.get("user-agent");
  const authHeader = request.headers.get("authorization");
  const cronSecretHeader = request.headers.get("x-cron-secret");
  const xVercelSignature = request.headers.get("x-vercel-signature");
  
  console.log(`[FREE-CREDITS-CRON] 📋 Headers:`);
  console.log(`  - User-Agent: ${userAgent}`);
  console.log(`  - Authorization: ${authHeader ? "***" : "none"}`);
  console.log(`  - x-cron-secret: ${cronSecretHeader ? "***" : "none"}`);
  console.log(`  - x-vercel-signature: ${xVercelSignature ? "***" : "none"}`);
  console.log("=".repeat(80));

  try {
    // Vérifier si c'est un appel Vercel Cron
    const cronSecret = process.env.CRON_SECRET;
    const isDevelopment = process.env.NODE_ENV === "development" || !process.env.VERCEL;
    
    // Vercel Cron envoie User-Agent: vercel-cron/1.0
    const isVercelCronUserAgent = userAgent === "vercel-cron/1.0";
    
    // Vérifier si c'est un appel depuis Vercel Cron
    const isVercelCron = 
      isVercelCronUserAgent || // User-Agent identifie Vercel Cron
      (cronSecret && (
        authHeader === `Bearer ${cronSecret}` ||
        cronSecretHeader === cronSecret
      )) || 
      isDevelopment;

    if (isVercelCron) {
      // Appel depuis Vercel Cron - exécuter directement
      console.log(`[FREE-CREDITS-CRON] ✅ Authenticated as Vercel Cron (User-Agent: ${userAgent || "none"})`);
      
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
    
    // Pour GET, pas de body. Pour POST, essayer de parser le body
    let body = {};
    if (request.method === "POST") {
      try {
        body = await request.json();
      } catch {
        // Body vide ou invalide, utiliser les valeurs par défaut
      }
    }
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

export async function POST(request: NextRequest) {
  return handleCronRequest(request);
}

export async function GET(request: NextRequest) {
  // GET peut être appelé par Vercel Cron ou par un admin
  // On utilise la même fonction que POST
  return handleCronRequest(request);
}
