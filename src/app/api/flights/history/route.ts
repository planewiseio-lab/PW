import { NextRequest } from "next/server";
import { withFlightHistoryAccess } from "@/lib/withActionAccess";

// Flight history endpoint with combined access control
export const GET = withFlightHistoryAccess(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const aircraftId = searchParams.get("aircraftId");
  const limit = parseInt(searchParams.get("limit") || "50");

  if (!aircraftId) {
    return NextResponse.json(
      { error: "Aircraft ID is required" },
      { status: 400 }
    );
  }

  // Simulate flight history API call to ABD
  const flightHistory = Array.from({ length: Math.min(limit, 20) }, (_, i) => ({
    id: `flight-${i + 1}`,
    flightNumber: `AC${100 + i}`,
    departure: {
      airport: "CYYZ",
      city: "Toronto",
      time: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
    },
    arrival: {
      airport: "CYVR",
      city: "Vancouver",
      time: new Date(
        Date.now() - i * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000
      ).toISOString(),
    },
    status: i === 0 ? "Completed" : "Completed",
    duration: "4h 30m",
    source: "ABD_API",
  }));

  return NextResponse.json({
    success: true,
    data: flightHistory,
    total: flightHistory.length,
    timestamp: new Date().toISOString(),
  });
});
