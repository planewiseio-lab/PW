import { NextRequest, NextResponse } from "next/server";
import { withAircraftLookupAccess } from "@/lib/withActionAccess";

// Aircraft lookup endpoint with combined access control (credits for authenticated, guest quota for anonymous)
export const POST = withAircraftLookupAccess(async (request: NextRequest) => {
  const body = await request.json();
  const { registration } = body;

  if (!registration) {
    return NextResponse.json(
      { error: "Registration is required" },
      { status: 400 }
    );
  }

  // Simulate aircraft lookup API call to ABD
  const aircraftData = {
    registration,
    type: "Boeing 737-800",
    airline: "Air Canada",
    age: 5,
    status: "Active",
    lastSeen: new Date().toISOString(),
    source: "ABD_API",
  };

  return NextResponse.json({
    success: true,
    data: aircraftData,
    timestamp: new Date().toISOString(),
  });
});
