import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withCreditChargeABD } from "@/lib/withCreditChargeABD-simple";
import { withGuestQuota } from "@/lib/withGuestQuota";
import { ActionType } from "@prisma/client";

/**
 * Wrapper combiné qui détecte si l'utilisateur est connecté
 * - Si connecté → utilise le système de crédits (withCreditChargeABD)
 * - Si invité → utilise le quota invité (withGuestQuota)
 */
export function withActionAccess<T = any>(
  actionType: ActionType,
  handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse<T>>
) {
  return async (
    request: NextRequest,
    ...args: any[]
  ): Promise<NextResponse<T>> => {
    try {
      // 1. Vérifier l'authentification Supabase
      const supabase = await createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      // 2. Si l'utilisateur est connecté, utiliser le système de crédits
      if (user && !authError) {
        console.log(
          `[Action Access] 👤 Authenticated user: ${user.id}, using credit system`
        );

        // Wrapper avec le système de crédits
        const creditHandler = withCreditChargeABD(actionType, handler);
        return await creditHandler(request, ...args);
      }

      // 3. Si l'utilisateur n'est pas connecté, utiliser le quota invité
      console.log(`[Action Access] 🎭 Guest user, using guest quota`);

      // Wrapper avec le quota invité
      const guestHandler = withGuestQuota(handler);
      return await guestHandler(request, ...args);
    } catch (error) {
      console.error(
        "[Action Access] 💥 Error in action access middleware:",
        error
      );

      // En cas d'erreur, on utilise le quota invité par défaut pour éviter de bloquer
      console.log("[Action Access] ⚠️ Fallback to guest quota due to error");
      const guestHandler = withGuestQuota(handler);
      return await guestHandler(request, ...args);
    }
  };
}

/**
 * Wrapper spécialisé pour les différents types d'actions
 */
export const withAircraftLookupAccess = <T = any>(
  handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse<T>>
) => withActionAccess(ActionType.AIRCRAFT_LOOKUP, handler);

export const withFlightHistoryAccess = <T = any>(
  handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse<T>>
) => withActionAccess(ActionType.VIEW_FLIGHT_HISTORY, handler);

export const withFlightBrowseAccess = <T = any>(
  handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse<T>>
) => withActionAccess(ActionType.BROWSE_FLIGHT, handler);

export const withAirportBrowseAccess = <T = any>(
  handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse<T>>
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
