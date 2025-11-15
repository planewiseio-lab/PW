import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cleanupExpiredCache } from "@/lib/supabaseCache";
import { logCronExecution } from "@/lib/cron/logCronExecution";

/**
 * Cron job pour nettoyer les données expirées/anciennes
 * Exécuté quotidiennement via Vercel Cron
 * 
 * Nettoie :
 * - Cache expiré (cache, cache_sorted_set)
 * - api_requests > 30 jours
 * - usage_events > 30 jours
 * - Tokens Supabase expirés (one_time_tokens, oauth_authorizations)
 * - Sessions Supabase expirées (sessions, refresh_tokens)
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  // Log de démarrage très visible pour Vercel
  console.log("=".repeat(80));
  console.log(`[CLEANUP-CRON] 🚀 STARTING at ${timestamp}`);
  console.log(`[CLEANUP-CRON] 📍 Path: /api/cron/cleanup`);
  console.log(`[CLEANUP-CRON] 🌍 Environment: ${process.env.NODE_ENV || "unknown"}`);
  console.log(`[CLEANUP-CRON] 🔐 Vercel: ${process.env.VERCEL ? "YES" : "NO"}`);
  console.log("=".repeat(80));

  try {
    // Vérifier le secret Vercel Cron (pour la sécurité)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    // Vercel peut aussi envoyer le secret via x-cron-secret (selon la version)
    const cronSecretHeader = request.headers.get("x-cron-secret");
    // Détecter le mode développement
    const isDevelopment = process.env.NODE_ENV === "development" || !process.env.VERCEL;

    // En développement, permettre l'accès sans vérification
    if (isDevelopment) {
      console.log("[CLEANUP-CRON] 🔧 Development mode - skipping authentication");
    } 
    // En production, vérifier le secret
    else if (cronSecret) {
      // Vercel envoie le secret via Authorization: Bearer <secret>
      // ou via x-cron-secret (selon la version)
      const isValidSecret = 
        authHeader === `Bearer ${cronSecret}` ||
        cronSecretHeader === cronSecret;
      
      if (!isValidSecret) {
        console.error("[CLEANUP-CRON] ❌ Invalid CRON_SECRET");
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }
      console.log("[CLEANUP-CRON] ✅ Authenticated with CRON_SECRET");
    } else {
      // Production sans secret = erreur (sécurité)
      console.error("[CLEANUP-CRON] ❌ CRON_SECRET not configured in production");
      return NextResponse.json(
        { error: "CRON_SECRET not configured" },
        { status: 500 }
      );
    }

    // Enregistrer le début de l'exécution
    const logEntry = await logCronExecution({
      jobName: "cleanup",
      status: "running",
      metadata: { source: "vercel-cron", timestamp },
    });

    try {
      const report = {
      timestamp: new Date().toISOString(),
      cache: { deleted: 0, error: null as string | null },
      apiRequests: { deleted: 0, error: null as string | null },
      usageEvents: { deleted: 0, error: null as string | null },
      tokens: { deleted: 0, error: null as string | null },
      sessions: { deleted: 0, error: null as string | null },
      refreshTokens: { deleted: 0, error: null as string | null },
      duration: 0,
    };

    console.log("[CLEANUP] 🧹 Starting database cleanup...");

    // 1. Nettoyer le cache expiré
    try {
      console.log("[CLEANUP] 1️⃣ Cleaning expired cache...");
      
      // Compter les entrées avant suppression
      const cacheCountBefore = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count FROM cache WHERE expires_at < NOW()
      `;
      const sortedSetCountBefore = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count FROM cache_sorted_set WHERE expires_at < NOW()
      `;
      
      // Nettoyer
      await cleanupExpiredCache();
      
      // Compter les entrées supprimées
      report.cache.deleted = 
        Number(cacheCountBefore[0]?.count || 0) + 
        Number(sortedSetCountBefore[0]?.count || 0);
      
      console.log(`[CLEANUP] ✅ Cache cleaned: ${report.cache.deleted} entries`);
    } catch (error) {
      report.cache.error = error instanceof Error ? error.message : "Unknown error";
      console.error("[CLEANUP] ❌ Cache cleanup error:", error);
    }

    // 2. Nettoyer api_requests > 30 jours
    try {
      console.log("[CLEANUP] 2️⃣ Cleaning api_requests older than 30 days...");
      const result = await prisma.$executeRaw`
        DELETE FROM api_requests
        WHERE created_at < NOW() - INTERVAL '30 days'
      `;
      report.apiRequests.deleted = typeof result === 'number' ? result : 0;
      console.log(`[CLEANUP] ✅ API requests cleaned: ${report.apiRequests.deleted} entries`);
    } catch (error) {
      report.apiRequests.error = error instanceof Error ? error.message : "Unknown error";
      console.error("[CLEANUP] ❌ API requests cleanup error:", error);
    }

    // 3. Nettoyer usage_events > 30 jours
    try {
      console.log("[CLEANUP] 3️⃣ Cleaning usage_events older than 30 days...");
      const result = await prisma.$executeRaw`
        DELETE FROM usage_events
        WHERE "createdAt" < NOW() - INTERVAL '30 days'
      `;
      report.usageEvents.deleted = typeof result === 'number' ? result : 0;
      console.log(`[CLEANUP] ✅ Usage events cleaned: ${report.usageEvents.deleted} entries`);
    } catch (error) {
      report.usageEvents.error = error instanceof Error ? error.message : "Unknown error";
      console.error("[CLEANUP] ❌ Usage events cleanup error:", error);
    }

    // 4. Nettoyer les tokens Supabase expirés (one_time_tokens)
    try {
      console.log("[CLEANUP] 4️⃣ Cleaning expired one_time_tokens...");
      // Les one_time_tokens n'ont pas de expires_at, donc on nettoie ceux > 7 jours
      const result = await prisma.$executeRaw`
        DELETE FROM auth.one_time_tokens
        WHERE created_at < NOW() - INTERVAL '7 days'
      `;
      report.tokens.deleted = typeof result === 'number' ? result : 0;
      console.log(`[CLEANUP] ✅ One-time tokens cleaned: ${report.tokens.deleted} entries`);
    } catch (error) {
      report.tokens.error = error instanceof Error ? error.message : "Unknown error";
      console.error("[CLEANUP] ❌ Tokens cleanup error:", error);
    }

    // 5. Nettoyer oauth_authorizations expirées
    try {
      console.log("[CLEANUP] 5️⃣ Cleaning expired oauth_authorizations...");
      const result = await prisma.$executeRaw`
        DELETE FROM auth.oauth_authorizations
        WHERE expires_at < NOW()
           OR (expires_at IS NULL AND created_at < NOW() - INTERVAL '7 days')
      `;
      const deletedCount = typeof result === 'number' ? result : 0;
      report.tokens.deleted += deletedCount;
      console.log(`[CLEANUP] ✅ OAuth authorizations cleaned: ${deletedCount} entries`);
    } catch (error) {
      report.tokens.error = error instanceof Error ? error.message : "Unknown error";
      console.error("[CLEANUP] ❌ OAuth authorizations cleanup error:", error);
    }

    // 6. Nettoyer les sessions expirées (sessions)
    try {
      console.log("[CLEANUP] 6️⃣ Cleaning expired sessions...");
      // Sessions avec not_after < NOW() ou créées > 30 jours sans not_after
      const result = await prisma.$executeRaw`
        DELETE FROM auth.sessions
        WHERE (not_after IS NOT NULL AND not_after < NOW())
           OR (not_after IS NULL AND created_at < NOW() - INTERVAL '30 days')
      `;
      report.sessions.deleted = typeof result === 'number' ? result : 0;
      console.log(`[CLEANUP] ✅ Sessions cleaned: ${report.sessions.deleted} entries`);
    } catch (error) {
      report.sessions.error = error instanceof Error ? error.message : "Unknown error";
      console.error("[CLEANUP] ❌ Sessions cleanup error:", error);
    }

    // 7. Nettoyer les refresh_tokens expirés ou anciens
    try {
      console.log("[CLEANUP] 7️⃣ Cleaning expired refresh_tokens...");
      // Refresh tokens sans session associée ou > 30 jours
      const result = await prisma.$executeRaw`
        DELETE FROM auth.refresh_tokens
        WHERE revoked = true
           OR (session_id IS NULL AND updated_at < NOW() - INTERVAL '30 days')
           OR (updated_at < NOW() - INTERVAL '90 days')
      `;
      report.refreshTokens.deleted = typeof result === 'number' ? result : 0;
      console.log(`[CLEANUP] ✅ Refresh tokens cleaned: ${report.refreshTokens.deleted} entries`);
    } catch (error) {
      report.refreshTokens.error = error instanceof Error ? error.message : "Unknown error";
      console.error("[CLEANUP] ❌ Refresh tokens cleanup error:", error);
    }

    report.duration = Date.now() - startTime;
    const totalDeleted = 
      report.cache.deleted +
      report.apiRequests.deleted +
      report.usageEvents.deleted +
      report.tokens.deleted +
      report.sessions.deleted +
      report.refreshTokens.deleted;

      const totalDuration = Date.now() - startTime;
      
      // Mettre à jour le log avec le résultat
      if (logEntry) {
        const { updateCronLog } = await import("@/lib/cron/logCronExecution");
        await updateCronLog(logEntry.id, {
          status: "success",
          result: { report, summary: { totalDeleted, duration: `${totalDuration}ms` } },
          duration: totalDuration,
        });
      } else {
        // Si la création a échoué, créer un nouveau log
        await logCronExecution({
          jobName: "cleanup",
          status: "success",
          result: { report, summary: { totalDeleted, duration: `${totalDuration}ms` } },
          duration: totalDuration,
          metadata: { source: "vercel-cron", timestamp },
        });
      }
      
      console.log("=".repeat(80));
      console.log(`[CLEANUP-CRON] ✅ COMPLETED in ${totalDuration}ms`);
      console.log(`[CLEANUP-CRON] 📊 Total entries deleted: ${totalDeleted}`);
      console.log(`[CLEANUP-CRON] 📋 Report:`, JSON.stringify(report, null, 2));
      console.log("=".repeat(80));

      return NextResponse.json({
        success: true,
        message: "Database cleanup completed",
        timestamp,
        report,
        summary: {
          totalDeleted,
          duration: `${totalDuration}ms`,
        },
      });
    } catch (error) {
      const totalDuration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      // Mettre à jour le log avec l'erreur
      if (logEntry) {
        const { updateCronLog } = await import("@/lib/cron/logCronExecution");
        await updateCronLog(logEntry.id, {
          status: "error",
          error: errorMessage,
          duration: totalDuration,
        });
      } else {
        // Si la création a échoué, créer un nouveau log
        await logCronExecution({
          jobName: "cleanup",
          status: "error",
          error: errorMessage,
          duration: totalDuration,
          metadata: { source: "vercel-cron", timestamp },
        });
      }
      
      console.error("=".repeat(80));
      console.error(`[CLEANUP-CRON] 💥 ERROR after ${totalDuration}ms`);
      console.error(`[CLEANUP-CRON] Error:`, error);
      console.error("=".repeat(80));
      
      return NextResponse.json(
        {
          success: false,
          error: "Internal server error",
          details: errorMessage,
          timestamp,
          duration: `${totalDuration}ms`,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    // Catch global pour les erreurs non gérées
    const totalDuration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    console.error("=".repeat(80));
    console.error(`[CLEANUP-CRON] 💥 FATAL ERROR after ${totalDuration}ms`);
    console.error(`[CLEANUP-CRON] Error:`, error);
    console.error("=".repeat(80));
    
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: errorMessage,
        timestamp,
        duration: `${totalDuration}ms`,
      },
      { status: 500 }
    );
  }
}

// GET pour tester localement (développement uniquement)
export async function GET(request: NextRequest) {
  // En développement, permettre GET pour tester
  if (process.env.NODE_ENV === "development") {
    console.log("[CLEANUP] 🔧 Development mode - GET request allowed");
    return POST(request);
  }
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

