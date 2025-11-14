import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  chargeOneCredit,
  ensureMonthlyTopUp,
  InsufficientCreditsError,
} from "@/lib/credits";
import { ActionType } from "@prisma/client";

export interface CreditChargeContext {
  request: NextRequest;
  userId: string;
}

export interface CreditChargeResponse<T = any> {
  data: T;
  credits: number;
}

/**
 * Middleware to charge 1 credit for an action
 */
export function withCreditCharge<T = any>(
  actionType: ActionType,
  handler: (ctx: CreditChargeContext) => Promise<T>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // Get user session
      const supabase = await createClient();
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // Ensure monthly top-up (non-blocking)
      try {
        await ensureMonthlyTopUp(user.id);
      } catch (error) {
        console.warn("Failed to ensure monthly top-up:", error);
        // Continue execution - this is best effort
      }

      // Generate idempotency key from request
      const url = new URL(request.url);
      const requestParams = {
        pathname: url.pathname,
        search: url.search,
        method: request.method,
        body: request.method !== "GET" ? await request.text() : undefined,
      };

      const idempotencyKey = `${user.id}-${actionType}-${JSON.stringify(
        requestParams
      )}`;

      // Charge credit
      const { newBalance } = await chargeOneCredit({
        userId: user.id,
        actionType,
        idempotencyKey,
        refId: url.pathname,
        metadata: {
          userAgent: request.headers.get("user-agent"),
          ip:
            request.headers.get("x-forwarded-for") ||
            request.headers.get("x-real-ip"),
        },
      });

      // Execute the actual handler
      const data = await handler({
        request,
        userId: user.id,
      });

      return NextResponse.json({
        data,
        credits: newBalance,
      });
    } catch (error) {
      if (error instanceof InsufficientCreditsError) {
        return NextResponse.json(
          {
            error: "Insufficient credits",
            code: "INSUFFICIENT_CREDITS",
            credits: 0,
          },
          { status: 402 }
        );
      }

      console.error("Credit charge error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}
