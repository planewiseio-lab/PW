import { NextRequest, NextResponse } from "next/server";
import {
  getClientIp,
  isGuestQuotaExceeded,
  incrementGuestUsage,
} from "./guestQuota";

/**
 * Middleware pour appliquer le quota invité
 * Vérifie si l'utilisateur a dépassé ses 3 requêtes sur 24h
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
              "Vous avez atteint la limite de 3 requêtes anonymes sur 24h. Connectez-vous pour débloquer le plan gratuit (5/jour).",
            remaining: 0,
            guestRemaining: 0,
            requiresAuth: true,
            upgradeUrl:
              "/login?redirect=" + encodeURIComponent(request.nextUrl.pathname),
          },
          { status: 429 }
        );
      }

      // 3. Incrémenter l'usage et exécuter le handler
      const usage = await incrementGuestUsage(clientIp);
      console.log(
        `[Guest Quota] ✅ Guest usage incremented: ${usage.count}/3 remaining: ${usage.remaining}`
      );

      // 4. Exécuter le handler original
      const response = await handler(request, ...args);

      // 5. Ajouter les headers de quota invité
      if (response instanceof NextResponse) {
        response.headers.set("X-Guest-Remaining", usage.remaining.toString());
        response.headers.set("X-Guest-Used", usage.count.toString());
        response.headers.set("X-Guest-Limit", "3");
      }

      // 6. Ajouter les informations de quota dans la réponse JSON
      try {
        const responseData = await response.json();
        const enhancedData = {
          ...responseData,
          guestRemaining: usage.remaining,
          guestUsed: usage.count,
          guestLimit: 3,
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
              "Vous avez atteint la limite de 3 requêtes anonymes sur 24h. Connectez-vous pour débloquer le plan gratuit (5/jour).",
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
