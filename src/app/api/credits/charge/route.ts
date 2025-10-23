import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chargeOneCredit, InsufficientCreditsError } from "@/lib/credits";
import { ActionType } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { actionType, idempotencyKey, refId, metadata } = body;

    if (!actionType) {
      return NextResponse.json(
        { error: "Missing required field: actionType" },
        { status: 400 }
      );
    }

    if (!Object.values(ActionType).includes(actionType)) {
      return NextResponse.json(
        { error: "Invalid actionType" },
        { status: 400 }
      );
    }

    const { newBalance } = await chargeOneCredit({
      userId: user.id,
      actionType,
      idempotencyKey,
      refId,
      metadata,
    });

    return NextResponse.json({ newBalance });
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      return NextResponse.json(
        {
          error: "Insufficient credits",
          code: "INSUFFICIENT_CREDITS",
        },
        { status: 402 }
      );
    }

    console.error("Error charging credit:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
