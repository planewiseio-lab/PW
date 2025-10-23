import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chargeOneCredit, InsufficientCreditsError } from "@/lib/credits";
import { ActionType } from "@prisma/client";

/**
 * Middleware simplifié pour les requêtes vers les API ABD
 * Version sans types stricts pour éviter les erreurs de build
 */
export function withCreditChargeABD(
  actionType: ActionType = ActionType.AIRCRAFT_LOOKUP,
  handler: (
    request: NextRequest,
    userId: string,
    newBalance: number
  ) => Promise<Response>
) {
  return async (request: NextRequest, ...args: any[]): Promise<Response> => {
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
      const endpoint = request.nextUrl.pathname;
      const method = request.method;
      const idempotencyKey = `abd-${userId}-${endpoint}-${method}-${Date.now()}`;

      console.log(
        `[ABD] 🛩️ ABD request charged for user: ${userId} (${actionType})`
      );

      // 2. Charger un crédit
      const { newBalance } = await chargeOneCredit({
        userId,
        actionType,
        idempotencyKey,
        refId: endpoint,
        metadata: {
          endpoint,
          method,
          userAgent: request.headers.get("user-agent"),
          source: "abd_api_request",
        },
      });

      console.log(
        `[ABD] ✅ Credit charged: ${userId} now has ${newBalance} credits`
      );

      // 3. Exécuter le handler
      const response = await handler(request, userId, newBalance);

      // 4. Ajouter les headers de debug
      if (response instanceof NextResponse) {
        response.headers.set("X-Credits-Remaining", newBalance.toString());
        response.headers.set("X-Credits-Charged", "1");
      }

      return response;
    } catch (error) {
      if (error instanceof InsufficientCreditsError) {
        console.warn(
          `[ABD] ❌ Insufficient credits for user: ${error.userId} on ${request.nextUrl.pathname}`
        );
        return NextResponse.json(
          {
            error: "Insufficient credits",
            code: "INSUFFICIENT_CREDITS",
            message: "You need at least 1 credit to use this service",
            credits: 0,
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
