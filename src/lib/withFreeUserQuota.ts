import { NextRequest, NextResponse } from "next/server";
import {
  isFreeUserQuotaExceeded,
  incrementFreeUserUsage,
  getFreeUserUsage,
  FREE_USER_QUOTA_LIMIT,
  FREE_USER_AIRCRAFT_LOOKUP_LIMIT,
} from "./guestQuota";
import { prisma } from "@/lib/prisma";
import { ActionType, CreditReason } from "@prisma/client";
import { getCreditBalance, chargeOneCredit } from "@/lib/credits";

// In-memory short-lived dedup to avoid counting duplicate free user requests
const inflightFreeUserMap: Map<string, number> = new Map();
const FREE_USER_DEDUP_WINDOW_MS = 2000;

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
 * Middleware pour appliquer le quota utilisateur Free
 * Vérifie si l'utilisateur Free a dépassé ses requêtes sur 24h
 * - 10 requêtes pour les lookups d'avions (uniquement /api/aircraft/[reg])
 * - 5 requêtes pour toutes les autres actions (recherches générales, vols, aéroports, etc.)
 * Les lookups d'avions et les recherches générales ont des quotas séparés
 */
/**
 * Log une requête dans le ledger avec delta=0 pour les quotas Free
 */
async function logQuotaUsage(userId: string, request: NextRequest, quotaType: "aircraft" | "general") {
  const endpoint = request.nextUrl.pathname;
  const method = request.method;
  
  try {
    await prisma.credit_ledger.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        delta: 0, // Pas de crédit débité, juste pour tracer
        reason: CreditReason.ACTION,
        actionType: ActionType.AIRCRAFT_LOOKUP,
        refId: endpoint,
        metadata: {
          endpoint,
          method,
          userAgent: request.headers.get("user-agent"),
          source: "free_user_quota",
          quotaType, // "aircraft" ou "general"
        },
      },
    });
    console.log(`[Free User Quota] 📝 Logged quota usage in ledger (quotaType: ${quotaType}, delta: 0)`);
  } catch (error) {
    console.error("[Free User Quota] ❌ Error logging quota usage:", error);
    // Ne pas bloquer la requête si le logging échoue
  }
}

export function withFreeUserQuota<T = any>(
  userId: string,
  handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse<T>>
) {
  return async (
    request: NextRequest,
    ...args: any[]
  ): Promise<NextResponse<T>> => {
    try {
      const isAircraftLookup = isAircraftLookupRequest(request);
      
      console.log(`[Free User Quota] 🎭 Checking quota for userId: ${userId}, isAircraftLookup: ${isAircraftLookup}`);

      let usage;
      let limit;
      let quotaType: "aircraft" | "general" | "credits" = "general";
      let usedCredits = false;
      let chargedCreditForAircraftAfterQuota = false;

      // Pour les requêtes d'avions, vérifier dans cet ordre :
      // 1. Quota aircraft lookup (10)
      // 2. Quota général (5)
      // 3. Crédits (-1 crédit)
      if (isAircraftLookup) {
        // 1. Vérifier le quota aircraft lookup
        const aircraftQuotaExceeded = await isFreeUserQuotaExceeded(userId, true);
        
        if (!aircraftQuotaExceeded) {
          // Utiliser le quota aircraft lookup
          limit = FREE_USER_AIRCRAFT_LOOKUP_LIMIT;
          quotaType = "aircraft";
          console.log(`[Free User Quota] ✅ Using aircraft lookup quota (10)`);
        } else {
          // 2. Vérifier le quota général
          const generalQuotaExceeded = await isFreeUserQuotaExceeded(userId, false);
          
          if (!generalQuotaExceeded) {
            // Utiliser le quota général ET débiter 1 crédit
            limit = FREE_USER_QUOTA_LIMIT;
            quotaType = "general";
            
            // Débiter 1 crédit car le quota aircraft est épuisé
            const balance = await getCreditBalance(userId);
            if (balance < 1) {
              const aircraftUsage = await getFreeUserUsage(userId, true);
              const generalUsage = await getFreeUserUsage(userId, false);
              
              return NextResponse.json(
                {
                  error: "INSUFFICIENT_CREDITS",
                  code: "INSUFFICIENT_CREDITS",
                  message:
                    "Vous avez atteint votre quota de lookups d'avions gratuits (10). Les lookups supplémentaires nécessitent des crédits. Achetez des crédits ou passez au plan Basic ou Pro.",
                  remaining: 0,
                  freeUserRemaining: 0,
                  freeUserUsed: Math.max(aircraftUsage.count, generalUsage.count),
                  freeUserLimit: Math.max(FREE_USER_AIRCRAFT_LOOKUP_LIMIT, FREE_USER_QUOTA_LIMIT),
                  requiresUpgrade: true,
                  upgradeUrl: "/checkout?plan=basic",
                },
                { status: 402 }
              );
            }
            
            // Charger un crédit
            const endpoint = request.nextUrl.pathname;
            const idempotencyKey = `free-aircraft-after-quota-${userId}-${endpoint}-${Date.now()}`;
            
            try {
              await chargeOneCredit({
                userId,
                actionType: ActionType.AIRCRAFT_LOOKUP,
                idempotencyKey,
                refId: endpoint,
                metadata: {
                  endpoint,
                  method: request.method,
                  userAgent: request.headers.get("user-agent"),
                  source: "free_user_aircraft_after_quota_exhausted",
                  quotaType: "general", // Utilise le quota général après épuisement du quota aircraft
                },
              });
              
              chargedCreditForAircraftAfterQuota = true;
              usedCredits = true;
              console.log(`[Free User Quota] ✅ Aircraft lookup quota exhausted, using general quota (5) AND charging 1 credit`);
            } catch (creditError) {
              console.error("[Free User Quota] ❌ Error charging credit:", creditError);
              return NextResponse.json(
                {
                  error: "INSUFFICIENT_CREDITS",
                  code: "INSUFFICIENT_CREDITS",
                  message: "Crédits insuffisants. Achetez des crédits ou passez au plan Basic ou Pro.",
                  requiresUpgrade: true,
                  upgradeUrl: "/checkout?plan=basic",
                },
                { status: 402 }
              );
            }
          } else {
            // 3. Utiliser les crédits (-1 crédit)
            const balance = await getCreditBalance(userId);
            if (balance < 1) {
              // Pas de crédits disponibles
              const aircraftUsage = await getFreeUserUsage(userId, true);
              const generalUsage = await getFreeUserUsage(userId, false);
              
              return NextResponse.json(
                {
                  error: "FREE_USER_QUOTA_EXCEEDED",
                  code: "FREE_USER_QUOTA_EXCEEDED",
                  message:
                    "Vous avez atteint vos limites de quotas gratuits (10 lookups d'avions et 5 requêtes générales). Achetez des crédits ou passez au plan Basic ou Pro pour continuer.",
                  remaining: 0,
                  freeUserRemaining: 0,
                  freeUserUsed: Math.max(aircraftUsage.count, generalUsage.count),
                  freeUserLimit: Math.max(FREE_USER_AIRCRAFT_LOOKUP_LIMIT, FREE_USER_QUOTA_LIMIT),
                  requiresUpgrade: true,
                  upgradeUrl: "/checkout?plan=basic",
                },
                { status: 429 }
              );
            }
            
            // Charger un crédit
            const endpoint = request.nextUrl.pathname;
            const idempotencyKey = `free-aircraft-${userId}-${endpoint}-${Date.now()}`;
            
            try {
              const { newBalance } = await chargeOneCredit({
                userId,
                actionType: ActionType.AIRCRAFT_LOOKUP,
                idempotencyKey,
                refId: endpoint,
                metadata: {
                  endpoint,
                  method: request.method,
                  userAgent: request.headers.get("user-agent"),
                  source: "free_user_after_quota_exhausted",
                },
              });
              
              limit = 0; // Pas de quota, on utilise les crédits
              quotaType = "credits";
              usedCredits = true;
              usage = { count: 0, remaining: 0, ttl: 0 }; // Pas de quota
              
              console.log(`[Free User Quota] 💳 Using credits after quota exhaustion (remaining: ${newBalance})`);
            } catch (creditError) {
              console.error("[Free User Quota] ❌ Error charging credit:", creditError);
              return NextResponse.json(
                {
                  error: "INSUFFICIENT_CREDITS",
                  code: "INSUFFICIENT_CREDITS",
                  message: "Crédits insuffisants. Achetez des crédits ou passez au plan Basic ou Pro.",
                  requiresUpgrade: true,
                  upgradeUrl: "/checkout?plan=basic",
                },
                { status: 402 }
              );
            }
          }
        }
      } else {
        // Pour les requêtes non-avions, utiliser le quota général ET débiter 1 crédit
        limit = FREE_USER_QUOTA_LIMIT;
        quotaType = "general";
        
        // Vérifier d'abord si le quota général n'est pas dépassé
        const generalQuotaExceeded = await isFreeUserQuotaExceeded(userId, false);
        
        if (generalQuotaExceeded) {
          const generalUsage = await getFreeUserUsage(userId, false);
          
          return NextResponse.json(
            {
              error: "FREE_USER_QUOTA_EXCEEDED",
              code: "FREE_USER_QUOTA_EXCEEDED",
              message:
                "Vous avez atteint la limite de 5 requêtes générales sur 24h. Passez au plan Basic ou Pro pour plus de requêtes.",
              remaining: 0,
              freeUserRemaining: 0,
              freeUserUsed: generalUsage.count,
              freeUserLimit: FREE_USER_QUOTA_LIMIT,
              freeUserTtl: generalUsage.ttl ?? 0,
              requiresUpgrade: true,
              upgradeUrl: "/checkout?plan=basic",
            },
            { status: 429 }
          );
        }
        
        // Débiter 1 crédit pour les requêtes non-aircraft
        const balance = await getCreditBalance(userId);
        if (balance < 1) {
          return NextResponse.json(
            {
              error: "INSUFFICIENT_CREDITS",
              code: "INSUFFICIENT_CREDITS",
              message: "Crédits insuffisants. Achetez des crédits ou passez au plan Basic ou Pro.",
              requiresUpgrade: true,
              upgradeUrl: "/checkout?plan=basic",
            },
            { status: 402 }
          );
        }
        
        // Charger un crédit
        const endpoint = request.nextUrl.pathname;
        const idempotencyKey = `free-general-${userId}-${endpoint}-${Date.now()}`;
        
        try {
          await chargeOneCredit({
            userId,
            actionType: ActionType.BROWSE_FLIGHT, // Utiliser le bon ActionType selon le type de requête
            idempotencyKey,
            refId: endpoint,
            metadata: {
              endpoint,
              method: request.method,
              userAgent: request.headers.get("user-agent"),
              source: "free_user_general_request",
              quotaType: "general",
            },
          });
          
          usedCredits = true;
          console.log(`[Free User Quota] ✅ General request using quota (5) AND charging 1 credit`);
        } catch (creditError) {
          console.error("[Free User Quota] ❌ Error charging credit:", creditError);
          return NextResponse.json(
            {
              error: "INSUFFICIENT_CREDITS",
              code: "INSUFFICIENT_CREDITS",
              message: "Crédits insuffisants. Achetez des crédits ou passez au plan Basic ou Pro.",
              requiresUpgrade: true,
              upgradeUrl: "/checkout?plan=basic",
            },
            { status: 402 }
          );
        }
      }

      // Toujours incrémenter le quota approprié (même si on charge un crédit aussi)
      const quotaToCheck = quotaType === "aircraft";
      const quotaExceeded = await isFreeUserQuotaExceeded(userId, quotaToCheck);
      
      // Vérifier seulement si on n'utilise pas les crédits uniquement (cas où les deux quotas sont épuisés)
      if (!usedCredits && quotaExceeded) {
        const usageData = await getFreeUserUsage(userId, quotaToCheck);
        
        return NextResponse.json(
          {
            error: "FREE_USER_QUOTA_EXCEEDED",
            code: "FREE_USER_QUOTA_EXCEEDED",
            message:
              `Vous avez atteint la limite de ${limit} requêtes ${quotaType === "aircraft" ? "de lookup d'avions" : ""} sur 24h. Passez au plan Basic ou Pro pour plus de requêtes.`,
            remaining: 0,
            freeUserRemaining: 0,
            freeUserUsed: usageData.count,
            freeUserLimit: limit,
            freeUserTtl: usageData.ttl ?? 0,
            requiresUpgrade: true,
            upgradeUrl: "/checkout?plan=basic",
          },
          { status: 429 }
        );
      }

      // Incrémenter le quota approprié (aircraft ou general)
      // Même si on charge un crédit, on incrémente aussi le quota général
      if (quotaType === "aircraft" || quotaType === "general") {
        // Déduplication courte pour éviter le double comptage
        const url = new URL(request.url);
        const dedupKey = `${userId}:${request.method}:${url.pathname}:${url.search}`;
        const now = Date.now();

        // Déterminer le type de quota à incrémenter (true pour aircraft, false pour general)
        const isAircraftQuota = quotaType === "aircraft";
        
        // Try Redis-based dedup if available
        try {
          const { getRedisValue, setRedisValue } = await import("@/lib/redis");
          const redisKey = `dedup:free:${dedupKey}`;
          const existing = await getRedisValue(redisKey);
          if (existing) {
            console.log(`[Free User Quota] ⏩ Dedup hit (redis), skipping increment for ${dedupKey}`);
            usage = await getFreeUserUsage(userId, isAircraftQuota);
          } else {
            // set with TTL ~2s
            await setRedisValue(redisKey, "1", Math.ceil(FREE_USER_DEDUP_WINDOW_MS / 1000));
            usage = await incrementFreeUserUsage(userId, isAircraftQuota);
            
            // Logger dans le ledger avec delta=0 UNIQUEMENT si on ne charge pas de crédit
            // Si on charge un crédit, il sera loggé séparément par chargeOneCredit avec delta=-1
            if (!chargedCreditForAircraftAfterQuota && !(quotaType === "general" && usedCredits)) {
              await logQuotaUsage(userId, request, quotaType as "aircraft" | "general");
            }
          }
        } catch {
          // Fallback in-memory
          const lastTs = inflightFreeUserMap.get(dedupKey) || 0;
          if (now - lastTs < FREE_USER_DEDUP_WINDOW_MS) {
            console.log(`[Free User Quota] ⏩ Dedup hit, skipping increment for ${dedupKey}`);
            usage = await getFreeUserUsage(userId, isAircraftQuota);
          } else {
            inflightFreeUserMap.set(dedupKey, now);
            usage = await incrementFreeUserUsage(userId, isAircraftQuota);
            
            // Logger dans le ledger avec delta=0 UNIQUEMENT si on ne charge pas de crédit
            // Si on charge un crédit, il sera loggé séparément par chargeOneCredit avec delta=-1
            if (!chargedCreditForAircraftAfterQuota && !(quotaType === "general" && usedCredits)) {
              await logQuotaUsage(userId, request, quotaType as "aircraft" | "general");
            }
            
            setTimeout(() => {
              inflightFreeUserMap.delete(dedupKey);
            }, FREE_USER_DEDUP_WINDOW_MS);
          }
        }
        console.log(
          `[Free User Quota] ✅ Free user usage incremented: ${usage.count}/${limit} remaining: ${usage.remaining} (quotaType: ${quotaType})`
        );
      } else {
        // On utilise les crédits, usage est déjà défini
        usage = { count: 0, remaining: 0, ttl: 0 };
      }

      // Exécuter le handler original
      const response = await handler(request, ...args);

      // Ajouter les headers de quota ou de crédits
      if (response instanceof NextResponse) {
        const balance = await getCreditBalance(userId);
        
        if (chargedCreditForAircraftAfterQuota || (quotaType === "general" && usedCredits)) {
          // Cas spécial : on utilise le quota général ET on charge un crédit
          response.headers.set("X-Free-User-Remaining", usage.remaining.toString());
          response.headers.set("X-Free-User-Used", usage.count.toString());
          response.headers.set("X-Free-User-Limit", limit.toString());
          response.headers.set("X-Credits-Remaining", balance.toString());
          response.headers.set("X-Credits-Charged", "1");
        } else if (usedCredits) {
          response.headers.set("X-Credits-Remaining", balance.toString());
          response.headers.set("X-Credits-Charged", "1");
        } else {
          response.headers.set("X-Free-User-Remaining", usage.remaining.toString());
          response.headers.set("X-Free-User-Used", usage.count.toString());
          response.headers.set("X-Free-User-Limit", limit.toString());
        }
      }

      // Ajouter les informations de quota dans la réponse JSON
      try {
        const responseData = await response.json();
        const enhancedData = {
          ...responseData,
          isFreeUser: true,
          quotaType, // "aircraft", "general", ou "credits"
        };

        const balance = await getCreditBalance(userId);
        
        if (chargedCreditForAircraftAfterQuota || (quotaType === "general" && usedCredits)) {
          // Cas spécial : on utilise le quota général ET on charge un crédit
          enhancedData.freeUserRemaining = usage.remaining;
          enhancedData.freeUserUsed = usage.count;
          enhancedData.freeUserLimit = limit;
          enhancedData.creditsRemaining = balance;
          enhancedData.creditsCharged = 1;
        } else if (usedCredits) {
          enhancedData.creditsRemaining = balance;
          enhancedData.creditsCharged = 1;
        } else {
          enhancedData.freeUserRemaining = usage.remaining;
          enhancedData.freeUserUsed = usage.count;
          enhancedData.freeUserLimit = limit;
        }

        return NextResponse.json(enhancedData, {
          status: response.status,
          headers: response.headers,
        });
      } catch (jsonError) {
        // Si la réponse n'est pas du JSON, on retourne la réponse originale
        return response;
      }
    } catch (error) {
      console.error("[Free User Quota] 💥 Error in free user quota middleware:", error);

      // En cas d'erreur, on autorise la requête pour éviter de bloquer le service
      console.log(
        "[Free User Quota] ⚠️ Allowing request due to quota system error"
      );
      return await handler(request, ...args);
    }
  };
}

