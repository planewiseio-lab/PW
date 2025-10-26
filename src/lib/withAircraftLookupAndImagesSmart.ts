import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chargeOneCredit, chargeMultipleCredits, InsufficientCreditsError } from "@/lib/credits";
import { ActionType } from "@prisma/client";

/**
 * Smart middleware for aircraft lookup that charges credits intelligently:
 * - Always charge 1 credit for aircraft data
 * - Only charge 1 credit for images if images are actually found
 */
export function withAircraftLookupAndImagesSmart<T = any>(
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
        console.error("[AIRCRAFT+IMAGES-SMART] ❌ Unauthorized access:", authError?.message);
        return NextResponse.json(
          { error: "Unauthorized", code: "AUTH_REQUIRED" },
          { status: 401 }
        );
      }

      const userId = user.id;
      const endpoint = request.nextUrl.pathname;
      const method = request.method;

      // Create idempotency key based on request content
      const url = new URL(request.url);
      const searchParams = url.searchParams.toString();
      const requestHash = `${endpoint}-${method}-${searchParams}`;
      const baseIdempotencyKey = `aircraft+images-smart-${userId}-${requestHash}`;

      console.log(
        `[AIRCRAFT+IMAGES-SMART] 🛩️ Smart aircraft lookup for user: ${userId}`
      );
      console.log(`[AIRCRAFT+IMAGES-SMART] 🔑 Base idempotency key: ${baseIdempotencyKey}`);

      // 2. First, check if images are available (without charging credits)
      const registration = url.pathname.split('/').pop();
      let hasImages = false;
      
      if (registration) {
        try {
          const imagesResponse = await fetch(`${url.origin}/api/images?q=${registration}`, {
            method: "GET",
            headers: {
              "Accept": "application/json",
            },
          });
          
          if (imagesResponse.ok) {
            const imagesData = await imagesResponse.json();
            hasImages = imagesData.images && imagesData.images.length > 0;
            console.log(`[AIRCRAFT+IMAGES-SMART] 🖼️ Images check for ${registration}: ${hasImages ? 'found' : 'none'}`);
          }
        } catch (error) {
          console.log(`[AIRCRAFT+IMAGES-SMART] ⚠️ Could not check images:`, error.message);
        }
      }

      // 3. Charge credits based on what's available
      let chargedActions = [];
      let totalCredits = 1; // Always charge for aircraft data
      
      if (hasImages) {
        totalCredits = 2; // Charge for both data and images
        chargedActions = [ActionType.AIRCRAFT_LOOKUP, ActionType.AIRCRAFT_LOOKUP];
        
        // Charge 2 credits atomically
        const { newBalance } = await chargeMultipleCredits({
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
              actionType: ActionType.AIRCRAFT_LOOKUP,
              refId: endpoint,
              metadata: {
                endpoint,
                method,
                userAgent: request.headers.get("user-agent"),
                source: "aircraft_lookup",
                part: "aircraft_images",
                actionSubType: "AIRCRAFT_IMAGES",
              },
            },
          ],
          baseIdempotencyKey,
        });
        
        console.log(
          `[AIRCRAFT+IMAGES-SMART] ✅ 2 credits charged: ${userId} now has ${newBalance} credits (data + images)`
        );
      } else {
        // Only charge for aircraft data
        const { newBalance } = await chargeOneCredit({
          userId,
          actionType: ActionType.AIRCRAFT_LOOKUP,
          idempotencyKey: baseIdempotencyKey,
          refId: endpoint,
          metadata: {
            endpoint,
            method,
            userAgent: request.headers.get("user-agent"),
            source: "aircraft_lookup",
            part: "aircraft_data_only",
            noImagesAvailable: true,
          },
        });
        
        chargedActions = [ActionType.AIRCRAFT_LOOKUP];
        console.log(
          `[AIRCRAFT+IMAGES-SMART] ✅ 1 credit charged: ${userId} now has ${newBalance} credits (data only, no images)`
        );
      }

      // 4. Execute the actual handler
      const response = await handler(request, context);

      // 5. Add headers with credit information
      response.headers.set("X-Credits-Charged", totalCredits.toString());
      response.headers.set("X-Charged-Actions", chargedActions.join(","));
      response.headers.set("X-Images-Available", hasImages.toString());

      return response;
    } catch (error) {
      if (error instanceof InsufficientCreditsError) {
        console.log(`[AIRCRAFT+IMAGES-SMART] ❌ Insufficient credits for user: ${userId}`);
        return NextResponse.json(
          {
            error: "Insufficient credits",
            code: "INSUFFICIENT_CREDITS",
            message: "You need at least 1 credit to lookup aircraft data",
            required: 1,
          },
          { status: 402 }
        );
      }

      console.error("[AIRCRAFT+IMAGES-SMART] ❌ Error:", error);
      return NextResponse.json(
        { error: "Internal server error", code: "INTERNAL_ERROR" },
        { status: 500 }
      );
    }
  };
}
