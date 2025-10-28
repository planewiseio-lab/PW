import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chargeOneCredit, InsufficientCreditsError } from "@/lib/credits";
import { ActionType } from "@prisma/client";

// Global cache for pending requests to prevent duplicate API calls
const pendingRequests = new Map<string, Promise<any>>();

/**
 * Middleware spécialisé pour les requêtes vers les API ABD (AircraftBaseData)
 * Débite automatiquement 1 crédit pour chaque requête ABD
 */
export function withCreditChargeABD<T = any>(
  actionType: ActionType = ActionType.AIRCRAFT_LOOKUP,
  handler: (request: NextRequest, context?: any) => Promise<NextResponse<T>>
) {
  return async (
    request: NextRequest,
    context?: any
  ): Promise<NextResponse<T>> => {
    try {
      // 1. Authentification Supabase
      const supabase = await createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json(
          { error: "Unauthorized", code: "AUTH_REQUIRED" },
          { status: 401 }
        );
      }

      // 2. Générer une clé d'idempotence basée sur l'endpoint et les paramètres
      const endpoint = request.nextUrl.pathname;
      const searchParams = request.nextUrl.searchParams.toString();
      const requestKey = `${user.id}-${endpoint}-${searchParams}`;

      // Check if request is already pending
      if (pendingRequests.has(requestKey)) {
        console.log(
          `[ABD] 🔄 Request already pending for ${requestKey}, waiting...`
        );
        const pendingResponse = await pendingRequests.get(requestKey);
        return pendingResponse;
      }

      const idempotencyKey = `abd-${user.id}-${endpoint}-${Date.now()}`;

      // 3. Logger la requête ABD (avant traitement)
      console.log(
        `[ABD] 🛩️ ABD request received for user: ${user.id} (${actionType})`
      );

      // 4. Créer une Promise pour la requête et la stocker dans le cache
      const requestPromise = (async () => {
        try {
          // Exécuter la requête API ABD d'abord
          const response = await handler(request, context);

          // Vérifier si la réponse vient du cache
          const isCached = response.headers.get("X-Cache") === "HIT";

          if (isCached) {
            console.log(
              `[ABD] 🎯 Cache hit for ${endpoint}, no credit charged`
            );
            // Retourner la réponse sans débitter de crédit
            return response;
          }

          // Débiter 1 crédit seulement si ce n'est pas en cache (atomique et idempotent)
          const { newBalance } = await chargeOneCredit({
            userId: user.id,
            actionType,
            idempotencyKey,
            refId: endpoint,
            metadata: {
              endpoint,
              method: request.method,
              userAgent: request.headers.get("user-agent"),
              timestamp: new Date().toISOString(),
              source: "abd_api_request",
            },
          });

          console.log(
            `[ABD] ✅ Credit charged: ${user.id} now has ${newBalance} credits`
          );

          // Ajouter des headers de debug (optionnel)
          response.headers.set("X-Credits-Remaining", newBalance.toString());
          response.headers.set("X-Credits-Charged", "1");

          return response;
        } catch (error) {
          if (error instanceof InsufficientCreditsError) {
            console.log(`[ABD] ❌ Insufficient credits for user: ${user.id}`);
            return NextResponse.json(
              {
                error: "Insufficient credits",
                code: "INSUFFICIENT_CREDITS",
                message: "You need at least 1 credit to use this service",
              },
              { status: 402 }
            );
          }

          // Autres erreurs de crédits
          console.error(
            `[ABD] 💥 Credit charging error for user ${user.id}:`,
            error
          );
          return NextResponse.json(
            {
              error: "Credit processing failed",
              code: "CREDIT_ERROR",
              message: "Unable to process credit transaction",
            },
            { status: 500 }
          );
        } finally {
          // Nettoyer le cache après completion
          pendingRequests.delete(requestKey);
        }
      })();

      // Stocker la Promise dans le cache
      pendingRequests.set(requestKey, requestPromise);

      // Attendre et retourner le résultat
      return await requestPromise;
    } catch (error) {
      console.error("[ABD] 💥 Fatal error in withCreditChargeABD:", error);
      return NextResponse.json(
        {
          error: "Internal server error",
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Wrapper spécialisé pour les requêtes d'historique de vol
 */
export function withCreditChargeFlightHistory<T = any>(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse<T>>
) {
  return withCreditChargeABD(ActionType.VIEW_FLIGHT_HISTORY, handler);
}

/**
 * Wrapper spécialisé pour les requêtes de navigation de vol
 */
export function withCreditChargeFlightBrowse<T = any>(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse<T>>
) {
  return withCreditChargeABD(ActionType.BROWSE_FLIGHT, handler);
}

/**
 * Wrapper spécialisé pour les requêtes de navigation d'aéroport
 */
export function withCreditChargeAirportBrowse<T = any>(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse<T>>
) {
  return withCreditChargeABD(ActionType.BROWSE_AIRPORT, handler);
}
