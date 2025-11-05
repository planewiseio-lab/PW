import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chargeMultipleCredits, InsufficientCreditsError } from "@/lib/credits";
import { ActionType } from "@prisma/client";

/**
 * Middleware for aircraft lookup that charges 2 credits:
 * 1 credit for aircraft data + 1 credit for images
 */
export function withAircraftLookupAndImages<T = any>(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse<T>>
) {
  return async (
    request: NextRequest,
    context?: any
  ): Promise<NextResponse<T>> => {
    let userId: string | undefined;
    try {
      // 1. Authentification Supabase
      const supabase = await createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        console.error("[AIRCRAFT+IMAGES] ❌ Unauthorized access:", authError?.message);
        return NextResponse.json(
          { error: "Unauthorized", code: "AUTH_REQUIRED" },
          { status: 401 }
        ) as NextResponse<T>;
      }

      userId = user.id;
      const endpoint = request.nextUrl.pathname;
      const method = request.method;

      // Create idempotency key based on request content
      const url = new URL(request.url);
      const searchParams = url.searchParams.toString();
      const requestHash = `${endpoint}-${method}-${searchParams}`;
      const baseIdempotencyKey = `aircraft+images-${userId}-${requestHash}`;

      console.log(
        `[AIRCRAFT+IMAGES] 🛩️ Aircraft lookup with images for user: ${userId}`
      );
      console.log(`[AIRCRAFT+IMAGES] 🔑 Base idempotency key: ${baseIdempotencyKey}`);

      // 2. Charge 2 credits (1 for aircraft data + 1 for images)
      const { newBalance, chargedActions } = await chargeMultipleCredits({
        userId,
        actions: [
          {
            actionType: ActionType.AIRCRAFT_LOOKUP,
            refId: endpoint,
            metadata: {
              endpoint,
              method,
              userAgent: request.headers.get("user-agent"),
              source: "aircraft_lookup",
              part: "aircraft_data",
            },
          },
          {
            actionType: ActionType.AIRCRAFT_LOOKUP, // Temporarily use AIRCRAFT_LOOKUP until migration is applied
            refId: endpoint,
            metadata: {
              endpoint,
              method,
              userAgent: request.headers.get("user-agent"),
              source: "aircraft_lookup",
              part: "aircraft_images",
              actionSubType: "AIRCRAFT_IMAGES", // Store as metadata for now
            },
          },
        ],
        baseIdempotencyKey,
      });

      console.log(
        `[AIRCRAFT+IMAGES] ✅ Credits charged: ${userId} now has ${newBalance} credits`
      );
      console.log(
        `[AIRCRAFT+IMAGES] 📊 Charged actions: ${chargedActions.join(", ")}`
      );

      // 3. Execute the actual handler
      const response = await handler(request, context);

      // 4. Add headers with credit information
      response.headers.set("X-Credits-Remaining", newBalance.toString());
      response.headers.set("X-Credits-Charged", "2");
      response.headers.set("X-Charged-Actions", chargedActions.join(","));

      return response;
    } catch (error) {
      if (error instanceof InsufficientCreditsError) {
        console.log(`[AIRCRAFT+IMAGES] ❌ Insufficient credits for user: ${userId || "unknown"}`);
        return NextResponse.json(
          {
            error: "Insufficient credits",
            code: "INSUFFICIENT_CREDITS",
            message: "You need 2 credits to lookup aircraft data and images",
            required: 2,
          },
          { status: 402 }
        ) as NextResponse<T>;
      }

      console.error("[AIRCRAFT+IMAGES] ❌ Error:", error);
      return NextResponse.json(
        { error: "Internal server error", code: "INTERNAL_ERROR" },
        { status: 500 }
      ) as NextResponse<T>;
    }
  };
}
