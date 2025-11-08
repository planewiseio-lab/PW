import { NextRequest, NextResponse } from "next/server";
import {
  getClientIp,
  isGuestQuotaExceeded,
  incrementGuestUsage,
  GUEST_QUOTA_LIMIT,
  GUEST_AIRCRAFT_LOOKUP_LIMIT,
} from "./guestQuota";

// In-memory short-lived dedup to avoid counting duplicate guest requests
// Keyed by IP + method + path + search, TTL ~ 2s (fallback when Redis absent)
const inflightGuestMap: Map<string, number> = new Map();
const GUEST_DEDUP_WINDOW_MS = 2000;

/**
 * Détermine si la requête est un lookup d'avion (exclut /flights, /history, /images)
 */
function isAircraftLookupRequest(request: NextRequest): boolean {
  const path = request.nextUrl.pathname.toLowerCase();
  // Seulement les routes /api/aircraft/[reg] simples, pas les sous-routes
  return (
    path.startsWith('/api/aircraft/') &&
    !path.includes('/flights') &&
    !path.includes('/history') &&
    !path.includes('/images')
  );
}

/**
 * Middleware pour appliquer le quota invité
 * Vérifie si l'utilisateur a dépassé ses requêtes sur 24h
 * - 5 requêtes pour les lookups d'avions (uniquement /api/aircraft/[reg])
 * - 3 requêtes pour toutes les autres actions (recherches générales, vols, aéroports, etc.)
 * Les lookups d'avions et les recherches générales ont des quotas séparés
 */
export function withGuestQuota<T = any>(
  handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse<T>>
) {
  return async (
    request: NextRequest,
    ...args: any[]
  ): Promise<NextResponse<T | { error: string; code: string; message: string; remaining: number; guestRemaining: number; guestUsed: number; guestLimit: number; guestTtl: number; requiresAuth: boolean; upgradeUrl: string }>> => {
    try {
      // 1. Récupérer l'IP client
      const clientIp = getClientIp(request);
      const isAircraftLookup = isAircraftLookupRequest(request);
      const limit = isAircraftLookup ? GUEST_AIRCRAFT_LOOKUP_LIMIT : GUEST_QUOTA_LIMIT;
      
      console.log(`[Guest Quota] 🎭 Checking quota for IP: ${clientIp}, isAircraftLookup: ${isAircraftLookup}, limit: ${limit}`);

      // 2. Vérifier AVANT l'incrémentation si le quota est déjà dépassé
      // Cela évite d'incrémenter inutilement si on est déjà à la limite
      const { getGuestUsage } = await import("./guestQuota");
      const currentUsage = await getGuestUsage(clientIp, isAircraftLookup);
      console.log(`[Guest Quota] 📊 Current usage before increment: ${currentUsage.count}/${limit}`);

      if (currentUsage.count >= limit) {
        console.log(`[Guest Quota] ❌ Quota already exceeded for IP: ${clientIp}, type: ${isAircraftLookup ? 'aircraft lookup' : 'general'}`);

        // Récupérer les stats du quota pour inclure les détails dans la réponse
        let stats: { used: number; remaining: number; limit: number; ttl: number } | null = null;
        try {
          const { getGuestQuotaStats } = await import("./guestQuota");
          stats = await getGuestQuotaStats(clientIp, isAircraftLookup);
          console.log(`[Guest Quota] 📊 Stats retrieved:`, {
            used: stats.used,
            remaining: stats.remaining,
            limit: stats.limit,
            ttl: stats.ttl,
          });
        } catch (error) {
          console.error("[Guest Quota] Failed to get quota stats:", error);
          // Utiliser les valeurs par défaut si getGuestQuotaStats échoue
        }

        const ttlValue = stats?.ttl ?? currentUsage.ttl;
        console.log(`[Guest Quota] 🔔 Returning error with TTL: ${ttlValue} seconds`);

        return NextResponse.json(
          {
            error: "GUEST_QUOTA_EXCEEDED",
            code: "GUEST_QUOTA_EXCEEDED",
            message:
              `Vous avez atteint la limite de ${limit} requêtes ${isAircraftLookup ? 'de lookup d\'avions' : 'anonymes'} sur 24h. Connectez-vous pour débloquer le plan gratuit.`,
            remaining: 0,
            guestRemaining: 0,
            guestUsed: stats?.used ?? currentUsage.count,
            guestLimit: limit,
            guestTtl: ttlValue, // TTL en secondes jusqu'à la réinitialisation
            requiresAuth: true,
            upgradeUrl:
              "/login?redirect=" + encodeURIComponent(request.nextUrl.pathname),
          },
          { status: 429 }
        );
      }

      // 3. Déduplication courte pour éviter le double comptage
      const url = new URL(request.url);
      const dedupKey = `${clientIp}:${request.method}:${url.pathname}:${url.search}`;
      const now = Date.now();
      let usage;

      // Try Redis-based dedup if available
      try {
        const { getRedisValue, setRedisValue } = await import("@/lib/redis");
        const redisKey = `dedup:${dedupKey}`;
        const existing = await getRedisValue(redisKey);
        if (existing) {
          console.log(`[Guest Quota] ⏩ Dedup hit (redis), skipping increment for ${dedupKey}`);
          usage = await getGuestUsage(clientIp, isAircraftLookup);
        } else {
          // set with TTL ~2s
          await setRedisValue(redisKey, "1", Math.ceil(GUEST_DEDUP_WINDOW_MS / 1000));
          usage = await incrementGuestUsage(clientIp, isAircraftLookup);
          
          // 4. Vérifier APRÈS l'incrémentation si on a dépassé la limite
          // Cela évite les race conditions où deux requêtes passent simultanément
          if (usage.count > limit) {
            console.log(`[Guest Quota] ❌ Quota exceeded AFTER increment: ${usage.count}/${limit} - blocking request`);
            
            // Récupérer les stats finales
            let stats: { used: number; remaining: number; limit: number; ttl: number } | null = null;
            try {
              const { getGuestQuotaStats } = await import("./guestQuota");
              stats = await getGuestQuotaStats(clientIp, isAircraftLookup);
            } catch (error) {
              console.error("[Guest Quota] Failed to get quota stats:", error);
            }

            const ttlValue = stats?.ttl ?? usage.ttl;
            return NextResponse.json(
              {
                error: "GUEST_QUOTA_EXCEEDED",
                code: "GUEST_QUOTA_EXCEEDED",
                message:
                  `Vous avez atteint la limite de ${limit} requêtes ${isAircraftLookup ? 'de lookup d\'avions' : 'anonymes'} sur 24h. Connectez-vous pour débloquer le plan gratuit.`,
                remaining: 0,
                guestRemaining: 0,
                guestUsed: stats?.used ?? usage.count,
                guestLimit: limit,
                guestTtl: ttlValue,
                requiresAuth: true,
                upgradeUrl:
                  "/login?redirect=" + encodeURIComponent(request.nextUrl.pathname),
              },
              { status: 429 }
            );
          }
        }
      } catch {
        // Fallback in-memory
        const lastTs = inflightGuestMap.get(dedupKey) || 0;
        if (now - lastTs < GUEST_DEDUP_WINDOW_MS) {
          console.log(`[Guest Quota] ⏩ Dedup hit, skipping increment for ${dedupKey}`);
          usage = await getGuestUsage(clientIp, isAircraftLookup);
        } else {
          inflightGuestMap.set(dedupKey, now);
          usage = await incrementGuestUsage(clientIp, isAircraftLookup);
          
          // Vérifier APRÈS l'incrémentation si on a dépassé la limite
          if (usage.count > limit) {
            console.log(`[Guest Quota] ❌ Quota exceeded AFTER increment: ${usage.count}/${limit} - blocking request`);
            
            let stats: { used: number; remaining: number; limit: number; ttl: number } | null = null;
            try {
              const { getGuestQuotaStats } = await import("./guestQuota");
              stats = await getGuestQuotaStats(clientIp, isAircraftLookup);
            } catch (error) {
              console.error("[Guest Quota] Failed to get quota stats:", error);
            }

            const ttlValue = stats?.ttl ?? usage.ttl;
            return NextResponse.json(
              {
                error: "GUEST_QUOTA_EXCEEDED",
                code: "GUEST_QUOTA_EXCEEDED",
                message:
                  `Vous avez atteint la limite de ${limit} requêtes ${isAircraftLookup ? 'de lookup d\'avions' : 'anonymes'} sur 24h. Connectez-vous pour débloquer le plan gratuit.`,
                remaining: 0,
                guestRemaining: 0,
                guestUsed: stats?.used ?? usage.count,
                guestLimit: limit,
                guestTtl: ttlValue,
                requiresAuth: true,
                upgradeUrl:
                  "/login?redirect=" + encodeURIComponent(request.nextUrl.pathname),
              },
              { status: 429 }
            );
          }
          
          setTimeout(() => {
            inflightGuestMap.delete(dedupKey);
          }, GUEST_DEDUP_WINDOW_MS);
        }
      }
      console.log(
        `[Guest Quota] ✅ Guest usage incremented: ${usage.count}/${limit} remaining: ${usage.remaining}`
      );

      // 4. Exécuter le handler original
      const response = await handler(request, ...args);

      // 5. Ajouter les headers de quota invité
      if (response instanceof NextResponse) {
        response.headers.set("X-Guest-Remaining", usage.remaining.toString());
        response.headers.set("X-Guest-Used", usage.count.toString());
        response.headers.set("X-Guest-Limit", limit.toString());
      }

      // 6. Ajouter les informations de quota dans la réponse JSON
      try {
        const responseData = await response.json();
        const enhancedData = {
          ...responseData,
          guestRemaining: usage.remaining,
          guestUsed: usage.count,
          guestLimit: limit,
          isGuest: true,
        };

        return NextResponse.json(enhancedData, {
          status: response.status,
          headers: response.headers,
        });
      } catch (jsonError) {
        // Si la réponse n'est pas du JSON, on retourne la réponse originale
        return response;
      }
    } catch (error) {
      console.error("[Guest Quota] 💥 Error in guest quota middleware:", error);

      // En cas d'erreur critique du système de quota, bloquer la requête par sécurité
      // Cela évite que les utilisateurs guest puissent contourner les limites
      console.log(
        "[Guest Quota] ⚠️ Quota system error - blocking request for security"
      );
      return NextResponse.json(
        {
          error: "GUEST_QUOTA_SYSTEM_ERROR",
          code: "GUEST_QUOTA_SYSTEM_ERROR",
          message: "Unable to verify guest quota. Please try again or log in.",
          remaining: 0,
          guestRemaining: 0,
          guestUsed: 0,
          guestLimit: 0,
          guestTtl: 0,
          requiresAuth: true,
          upgradeUrl: "/login?redirect=" + encodeURIComponent(request.nextUrl.pathname),
        },
        { status: 503 }
      );
    }
  };
}

/**
 * Middleware pour vérifier le quota sans l'incrémenter (lecture seule)
 */
export function withGuestQuotaCheck<T = any>(
  handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse<T>>
) {
  return async (
    request: NextRequest,
    ...args: any[]
  ): Promise<NextResponse<T | { error: string; code: string; message: string; remaining: number; guestRemaining: number; guestUsed: number; guestLimit: number; guestTtl: number; requiresAuth: boolean; upgradeUrl: string }>> => {
    try {
      const clientIp = getClientIp(request);
      const quotaExceeded = await isGuestQuotaExceeded(clientIp);

      if (quotaExceeded) {
        // Récupérer les stats du quota pour inclure les détails dans la réponse
        let stats: { used: number; remaining: number; limit: number; ttl?: number } | null = null;
        try {
          const { getGuestQuotaStats } = await import("./guestQuota");
          stats = await getGuestQuotaStats(clientIp);
        } catch (error) {
          console.error("[Guest Quota] Failed to get quota stats:", error);
          // Utiliser les valeurs par défaut si getGuestQuotaStats échoue
        }

        const ttlValue = stats?.ttl ?? 0;
        return NextResponse.json(
          {
            error: "GUEST_QUOTA_EXCEEDED",
            code: "GUEST_QUOTA_EXCEEDED",
            message:
              `Vous avez atteint la limite de ${GUEST_QUOTA_LIMIT} requêtes anonymes sur 24h. Connectez-vous pour débloquer le plan gratuit (5/jour).`,
            remaining: 0,
            guestRemaining: 0,
            guestUsed: stats?.used ?? GUEST_QUOTA_LIMIT,
            guestLimit: GUEST_QUOTA_LIMIT,
            guestTtl: ttlValue, // TTL en secondes jusqu'à la réinitialisation
            requiresAuth: true,
            upgradeUrl:
              "/login?redirect=" + encodeURIComponent(request.nextUrl.pathname),
          },
          { status: 429 }
        );
      }

      return await handler(request, ...args);
    } catch (error) {
      console.error("[Guest Quota Check] 💥 Error:", error);
      return await handler(request, ...args);
    }
  };
}
