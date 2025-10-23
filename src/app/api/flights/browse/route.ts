import { NextRequest, NextResponse } from "next/server";
import { withFlightBrowseAccess } from "@/lib/withActionAccess";

// Browse flight endpoint with combined access control
export const GET = withFlightBrowseAccess(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const flightNumber = searchParams.get("flightNumber");

  if (!flightNumber) {
    return NextResponse.json(
      { error: "Flight number is required" },
      { status: 400 }
    );
  }

  // Simulate flight browse API call to ABD
  const flightData = {
    flightNumber,
    airline: "Air Canada",
    aircraft: {
      type: "Boeing 737-800",
      registration: "C-FRSR",
      age: 5,
    },
    route: {
      departure: {
        airport: "CYYZ",
        city: "Toronto",
        terminal: "1",
        gate: "A12",
        scheduled: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        estimated: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        status: "On Time",
      },
      arrival: {
        airport: "CYVR",
        city: "Vancouver",
        terminal: "2",
        gate: "B8",
        scheduled: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
        estimated: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
        status: "On Time",
      },
    },
    status: "Scheduled",
    duration: "4h 30m",
    distance: "2080 nm",
    source: "ABD_API",
  };

  return NextResponse.json({
    success: true,
    data: flightData,
    timestamp: new Date().toISOString(),
  });
});
