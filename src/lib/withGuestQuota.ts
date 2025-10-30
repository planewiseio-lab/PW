import { NextRequest, NextResponse } from "next/server";
import {
  getClientIp,
  isGuestQuotaExceeded,
  incrementGuestUsage,
  GUEST_QUOTA_LIMIT,
} from "./guestQuota";

// In-memory short-lived dedup to avoid counting duplicate guest requests
// Keyed by IP + method + path + search, TTL ~ 2s
const inflightGuestMap: Map<string, number> = new Map();
const GUEST_DEDUP_WINDOW_MS = 2000;

/**
 * Middleware pour appliquer le quota invité
 * Vérifie si l'utilisateur a dépassé ses 4 requêtes sur 24h
 */
export function withGuestQuota<T = any>(
  handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse<T>>
) {
  return async (
    request: NextRequest,
    ...args: any[]
  ): Promise<NextResponse<T>> => {
    try {
      // 1. Récupérer l'IP client
      const clientIp = getClientIp(request);
      console.log(`[Guest Quota] 🎭 Checking quota for IP: ${clientIp}`);

      // 2. Vérifier si le quota est dépassé
      console.log(
        `[Guest Quota] 🔍 Checking quota exceeded for IP: ${clientIp}`
      );
      const quotaExceeded = await isGuestQuotaExceeded(clientIp);
      console.log(`[Guest Quota] 📊 Quota exceeded result: ${quotaExceeded}`);

      if (quotaExceeded) {
        console.log(`[Guest Quota] ❌ Quota exceeded for IP: ${clientIp}`);

        return NextResponse.json(
          {
            error: "GUEST_QUOTA_EXCEEDED",
            code: 429,
            message:
              `Vous avez atteint la limite de ${GUEST_QUOTA_LIMIT} requêtes anonymes sur 24h. Connectez-vous pour débloquer le plan gratuit (5/jour).`,
            remaining: 0,
            guestRemaining: 0,
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
      const lastTs = inflightGuestMap.get(dedupKey) || 0;
      let usage;

      if (now - lastTs < GUEST_DEDUP_WINDOW_MS) {
        console.log(`[Guest Quota] ⏩ Dedup hit, skipping increment for ${dedupKey}`);
        // Ne pas incrémenter, mais obtenir l'état courant pour les headers
        usage = await (async () => {
          const { getGuestUsage } = await import("./guestQuota");
          return getGuestUsage(clientIp);
        })();
      } else {
        inflightGuestMap.set(dedupKey, now);
        usage = await incrementGuestUsage(clientIp);
        // Nettoyage asynchrone du marqueur
        setTimeout(() => {
          inflightGuestMap.delete(dedupKey);
        }, GUEST_DEDUP_WINDOW_MS);
      }
      console.log(
        `[Guest Quota] ✅ Guest usage incremented: ${usage.count}/${GUEST_QUOTA_LIMIT} remaining: ${usage.remaining}`
      );

      // 4. Exécuter le handler original
      const response = await handler(request, ...args);

      // 5. Ajouter les headers de quota invité
      if (response instanceof NextResponse) {
        response.headers.set("X-Guest-Remaining", usage.remaining.toString());
        response.headers.set("X-Guest-Used", usage.count.toString());
        response.headers.set("X-Guest-Limit", GUEST_QUOTA_LIMIT.toString());
      }

      // 6. Ajouter les informations de quota dans la réponse JSON
      try {
        const responseData = await response.json();
        const enhancedData = {
          ...responseData,
          guestRemaining: usage.remaining,
          guestUsed: usage.count,
          guestLimit: GUEST_QUOTA_LIMIT,
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

      // En cas d'erreur, on autorise la requête pour éviter de bloquer le service
      console.log(
        "[Guest Quota] ⚠️ Allowing request due to quota system error"
      );
      return await handler(request, ...args);
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
  ): Promise<NextResponse<T>> => {
    try {
      const clientIp = getClientIp(request);
      const quotaExceeded = await isGuestQuotaExceeded(clientIp);

      if (quotaExceeded) {
        return NextResponse.json(
          {
            error: "GUEST_QUOTA_EXCEEDED",
            code: 429,
            message:
              `Vous avez atteint la limite de ${GUEST_QUOTA_LIMIT} requêtes anonymes sur 24h. Connectez-vous pour débloquer le plan gratuit (5/jour).`,
            remaining: 0,
            guestRemaining: 0,
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
