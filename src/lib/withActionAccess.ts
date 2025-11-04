import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withCreditChargeABD } from "@/lib/withCreditChargeABD-simple";
import { withGuestQuota } from "@/lib/withGuestQuota";
import { ActionType, Plan } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Wrapper combiné qui détecte si l'utilisateur est connecté
 * - Si connecté → utilise le système de crédits (withCreditChargeABD)
 * - Si invité → utilise le quota invité (withGuestQuota)
 */
export function withActionAccess<T = any>(
  actionType: ActionType,
  handler: (
    request: NextRequest,
    ...args: any[]
  ) => Promise<NextResponse<T> | Response>
) {
  return async (
    request: NextRequest,
    ...args: any[]
  ): Promise<NextResponse<T> | Response> => {
    try {
      // 1. Vérifier l'authentification Supabase
      const supabase = await createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      // Debug logs
      console.log(
        `[Action Access] 🔍 Auth debug - User:`,
        user ? user.id : "null"
      );
      console.log(
        `[Action Access] 🔍 Auth debug - Error:`,
        authError ? authError.message : "none"
      );
      console.log(`[Action Access] 🔍 Auth debug - URL:`, request.url);

      // 2. Si l'utilisateur est connecté, vérifier son plan
      if (user && !authError) {
        console.log(
          `[Action Access] 👤 Authenticated user: ${user.id}, checking plan`
        );

        // Vérifier le plan de l'utilisateur
        try {
          const subscription = await prisma.subscriptions.findUnique({
            where: { userId: user.id },
            select: { plan: true },
          });

          // Tous les plans (FREE, PRO, BASIC) utilisent maintenant le système de crédits par tiers
          console.log(
            `[Action Access] 💳 User: ${user.id}, plan: ${subscription?.plan}, using credit system with tier-based pricing`
          );

          // Wrapper avec le système de crédits (avec tiers : tier 1 = -1, tier 3 = -4, tier 2 = -2)
          const creditHandler = withCreditChargeABD(
            actionType,
            async (req, ...args) => {
              return await handler(req, ...args);
            }
          );
          return await creditHandler(request, ...args);
        } catch (dbError) {
          console.error(
            "[Action Access] 💥 Error checking subscription:",
            dbError
          );
          // En cas d'erreur DB, fallback vers crédits (ou guest selon contexte)
          const creditHandler = withCreditChargeABD(
            actionType,
            async (req, ...args) => {
              return await handler(req, ...args);
            }
          );
          return await creditHandler(request, ...args);
        }
      }

      // 3. Si l'utilisateur n'est pas connecté, vérifier si l'action nécessite une authentification
      // Certaines actions (comme VIEW_FLIGHT_HISTORY) sont réservées aux utilisateurs connectés
      const actionsRequiringAuth: ActionType[] = [
        ActionType.VIEW_FLIGHT_HISTORY,
      ];

      if (actionsRequiringAuth.includes(actionType)) {
        console.log(
          `[Action Access] 🚫 Guest user blocked - ${actionType} requires authentication`
        );
        return NextResponse.json(
          {
            error: "Authentication required",
            code: "AUTH_REQUIRED",
            message: "This action requires authentication. Please log in to continue.",
          },
          { status: 401 }
        );
      }

      // Pour les autres actions, utiliser le quota invité
      console.log(`[Action Access] 🎭 Guest user, using guest quota`);

      // Wrapper avec le quota invité
      const guestHandler = withGuestQuota(handler);
      return await guestHandler(request, ...args);
    } catch (error) {
      console.error(
        "[Action Access] 💥 Error in action access middleware:",
        error
      );

      // En cas d'erreur, retourner une erreur au lieu de fallback vers guest
      console.log("[Action Access] ❌ Returning error instead of fallback");
      return NextResponse.json(
        {
          error: "Authentication system error",
          code: "AUTH_SYSTEM_ERROR",
          message: "Unable to process authentication. Please try again.",
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Wrapper spécialisé pour les différents types d'actions
 */
export const withAircraftLookupAccess = <T = any>(
  handler: (
    request: NextRequest,
    ...args: any[]
  ) => Promise<NextResponse<T> | Response>
) => withActionAccess(ActionType.AIRCRAFT_LOOKUP, handler);

export const withFlightHistoryAccess = <T = any>(
  handler: (
    request: NextRequest,
    ...args: any[]
  ) => Promise<NextResponse<T> | Response>
) => withActionAccess(ActionType.VIEW_FLIGHT_HISTORY, handler);

export const withFlightBrowseAccess = <T = any>(
  handler: (
    request: NextRequest,
    ...args: any[]
  ) => Promise<NextResponse<T> | Response>
) => withActionAccess(ActionType.BROWSE_FLIGHT, handler);

export const withAirportBrowseAccess = <T = any>(
  handler: (
    request: NextRequest,
    ...args: any[]
  ) => Promise<NextResponse<T> | Response>
) => withActionAccess(ActionType.BROWSE_AIRPORT, handler);

/**
 * Fonction utilitaire pour vérifier le statut d'accès
 */
export async function getAccessStatus(request: NextRequest): Promise<{
  isAuthenticated: boolean;
  userId?: string;
  accessType: "credits" | "guest_quota";
  remaining?: number;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (user && !authError) {
      return {
        isAuthenticated: true,
        userId: user.id,
        accessType: "credits",
        remaining: undefined, // Sera déterminé par le système de crédits
      };
    }

    // Pour les invités, on ne peut pas déterminer le remaining sans faire une requête
    return {
      isAuthenticated: false,
      accessType: "guest_quota",
      remaining: undefined,
    };
  } catch (error) {
    console.error("[Action Access] Error getting access status:", error);
    return {
      isAuthenticated: false,
      accessType: "guest_quota",
      remaining: undefined,
    };
  }
}
