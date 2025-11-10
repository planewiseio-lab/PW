import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chargeOneCredit, InsufficientCreditsError, getCreditCost, ensureUserInitialized } from "@/lib/credits";
import { ActionType } from "@prisma/client";

// Global cache for pending requests to prevent duplicate API calls and credit charges
const pendingRequests = new Map<string, Promise<Response | NextResponse>>();

/**
 * Simplified middleware for ABD API requests
 * Version sans types stricts pour éviter les erreurs de build
 */
export function withCreditChargeABD(
  actionType: ActionType = ActionType.AIRCRAFT_LOOKUP,
  handler: (
    request: NextRequest,
    ...args: any[]
  ) => Promise<Response | NextResponse>
) {
  return async (
    request: NextRequest,
    ...args: any[]
  ): Promise<Response | NextResponse> => {
    try {
      // 1. Authentification Supabase
      const supabase = await createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        console.error("[ABD] ❌ Unauthorized access:", authError?.message);
        return NextResponse.json(
          { error: "Unauthorized", code: "AUTH_REQUIRED" },
          { status: 401 }
        );
      }

      const userId = user.id;
      
      // Ensure user is initialized (creates subscription and credits if needed)
      // This must be done BEFORE charging credits to avoid errors
      try {
        await ensureUserInitialized(userId);
      } catch (initError) {
        console.error(`[ABD] Failed to ensure user initialization for ${userId}:`, initError);
        // Continue anyway - ensureUserInitialized is best effort
        // If it fails, chargeOneCredit will handle the error appropriately
      }
      
      const endpoint = request.nextUrl.pathname;
      const method = request.method;
      const searchParams = request.nextUrl.searchParams.toString();
      
      // Create a request key for deduplication (prevents multiple simultaneous calls)
      const requestKey = `${userId}-${endpoint}-${searchParams}`;

      // Check if request is already pending (prevents duplicate API calls and credit charges)
      if (pendingRequests.has(requestKey)) {
        console.log(
          `[ABD] 🔄 Request already pending for ${requestKey}, waiting for existing request...`
        );
        const pendingResponse = await pendingRequests.get(requestKey)!;
        return pendingResponse;
      }

      // Create an idempotency key based on request content
      // This prevents duplicate charges for the same request (e.g., React Strict Mode double calls)
      // We include a timestamp to allow multiple manual searches for the same aircraft to debit credits
      // However, we also use a stable key per request to prevent multiple simultaneous calls
      const requestHash = `${endpoint}-${method}-${searchParams}`;
      // Use a timestamp-based key to allow each manual search to debit a credit
      // The timestamp ensures uniqueness for manual searches, but the stable hash prevents duplicate simultaneous calls
      const idempotencyKey = `abd-${userId}-${requestHash}-${Date.now()}`;

      console.log(
        `[ABD] 🛩️ ABD request charged for user: ${userId} (${actionType})`
      );
      console.log(`[ABD] 🔑 Idempotency key: ${idempotencyKey}`);

      // Create the request promise and store it immediately to prevent duplicates
      const requestPromise = (async () => {
        try {
          // Vérifier si c'est une recherche (pour ne pas facturer si cache uniquement)
          const url = new URL(request.url);
          const isSearchRequest = url.searchParams.get("search") && url.searchParams.get("search")?.trim();
          
          let newBalance: number | undefined;
          
          // Exécuter le handler d'abord pour toutes les requêtes afin de vérifier si on utilise uniquement le cache
          // Cela permet de ne pas facturer de crédits pour les requêtes qui utilisent uniquement le cache
          const response = await handler(request, ...args);
          
          // Vérifier le header pour savoir si on doit charger des crédits
          if (response instanceof NextResponse) {
            const skipCharge = response.headers.get("X-Skip-Credit-Charge") === "true";
            if (skipCharge) {
              const requestType = isSearchRequest ? "search" : "pagination";
              console.log(`[ABD] ⏭️ Skipping credit charge for ${requestType} request using cache only`);
              // Récupérer le solde actuel pour l'afficher dans le header
              const { getCreditBalance } = await import("@/lib/credits");
              const currentBalance = await getCreditBalance(userId);
              // Mettre à jour le header pour indiquer qu'aucun crédit n'a été débité
              response.headers.set("X-Credits-Charged", "0");
              response.headers.set("X-Credits-Remaining", currentBalance.toString());
              // Retirer le header skip pour éviter qu'il soit propagé
              response.headers.delete("X-Skip-Credit-Charge");
              return response;
            }
          }
          
          // Si on arrive ici, la requête a nécessité un appel API externe
          // On charge les crédits maintenant (après avoir exécuté le handler)
          const chargeResult = await chargeOneCredit({
            userId,
            actionType,
            idempotencyKey,
            refId: endpoint,
            metadata: {
              endpoint,
              method,
              userAgent: request.headers.get("user-agent"),
              source: "abd_api_request",
              isSearch: isSearchRequest || false,
            },
          });
          newBalance = chargeResult.newBalance;

          console.log(
            `[ABD] ✅ Credit charged (API call required): ${userId} now has ${newBalance} credits`
          );

          // Add debug headers (le handler a déjà été exécuté plus haut)
          if (response instanceof NextResponse) {
            response.headers.set("X-Credits-Remaining", newBalance.toString());
            response.headers.set("X-Credits-Charged", "1");
          }

          return response;
        } catch (error) {
          // Re-throw to be caught by outer catch block
          throw error;
        } finally {
          // Clean up pending request after completion
          pendingRequests.delete(requestKey);
        }
      })();

      // Store the promise immediately to prevent duplicate calls
      pendingRequests.set(requestKey, requestPromise);

      // Await the promise to catch errors from the handler
      try {
        return await requestPromise;
      } catch (error) {
        // This catch handles errors from both chargeOneCredit and the handler
        if (error instanceof InsufficientCreditsError) {
          console.warn(
            `[ABD] ❌ Insufficient credits for user: ${userId} on ${request.nextUrl.pathname}`
          );
          const cost = getCreditCost(actionType);
          return NextResponse.json(
            {
              error: "Insufficient credits",
              code: "INSUFFICIENT_CREDITS",
              message: `You need at least ${cost} credit${cost > 1 ? "s" : ""} to use this service`,
              credits: 0,
              requiredCredits: cost,
            },
            { status: 402 }
          );
        } else {
          console.error(
            `[ABD] 💥 Error processing request for user ${userId} on ${request.nextUrl.pathname}:`,
            error
          );
          // Log the full error stack for debugging
          if (error instanceof Error) {
            console.error(`[ABD] Error stack:`, error.stack);
            console.error(`[ABD] Error message:`, error.message);
          }
          return NextResponse.json(
            { 
              error: "Internal server error", 
              code: "INTERNAL_ERROR",
              message: error instanceof Error ? error.message : "Unknown error"
            },
            { status: 500 }
          );
        }
      }
    } catch (error) {
      if (error instanceof InsufficientCreditsError) {
        // userId might not be available at this point, use "unknown" if not available
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn(
          `[ABD] ❌ Insufficient credits on ${request.nextUrl.pathname}: ${errorMessage}`
        );
        const cost = getCreditCost(actionType);
        return NextResponse.json(
          {
            error: "Insufficient credits",
            code: "INSUFFICIENT_CREDITS",
            message: `You need at least ${cost} credit${cost > 1 ? "s" : ""} to use this service`,
            credits: 0,
            requiredCredits: cost,
          },
          { status: 402 }
        );
      } else {
        console.error(
          `[ABD] 💥 Error processing credit for user on ${request.nextUrl.pathname}:`,
          error
        );
        return NextResponse.json(
          { error: "Credit processing failed", code: "CREDIT_ERROR" },
          { status: 500 }
        );
      }
    }
  };
}
