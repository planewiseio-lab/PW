import { NextResponse } from "next/server";

export async function GET() {
  // All features are now public - no subscription required
  return NextResponse.json({
    isPro: true, // Everyone gets Pro features
    subscription: {
      plan: "pro",
      status: "active",
      created_at: new Date().toISOString(),
    },
  });
}
