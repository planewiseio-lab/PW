import { NextRequest, NextResponse } from "next/server";
import { withAirportBrowseAccess } from "@/lib/withActionAccess";

// Browse airport endpoint with combined access control
export const GET = withAirportBrowseAccess(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const icao = searchParams.get("icao");

  if (!icao) {
    return NextResponse.json(
      { error: "ICAO code is required" },
      { status: 400 }
    );
  }

  // Simulate airport browse API call to ABD
  const airportData = {
    icao,
    iata: icao === "CYYZ" ? "YYZ" : "YVR",
    name:
      icao === "CYYZ"
        ? "Toronto Pearson International Airport"
        : "Vancouver International Airport",
    city: icao === "CYYZ" ? "Toronto" : "Vancouver",
    country: "Canada",
    timezone: "America/Toronto",
    coordinates: {
      latitude: icao === "CYYZ" ? 43.6777 : 49.1967,
      longitude: icao === "CYYZ" ? -79.6246 : -123.1815,
    },
    runways:
      icao === "CYYZ"
        ? [
            { id: "05L/23R", length: 11000, width: 200 },
            { id: "05R/23L", length: 11000, width: 200 },
            { id: "06L/24R", length: 9000, width: 200 },
            { id: "06R/24L", length: 9000, width: 200 },
          ]
        : [
            { id: "08L/26R", length: 11000, width: 200 },
            { id: "08R/26L", length: 11000, width: 200 },
          ],
    currentWeather: {
      temperature: 22,
      condition: "Clear",
      wind: { speed: 8, direction: 270 },
      visibility: 10,
      pressure: 1013,
    },
    arrivals: Array.from({ length: 5 }, (_, i) => ({
      flight: `AC${100 + i}`,
      airline: "Air Canada",
      from: "Montreal",
      scheduled: new Date(Date.now() + i * 30 * 60 * 1000).toISOString(),
      status: i === 0 ? "Landed" : "On Time",
    })),
    departures: Array.from({ length: 5 }, (_, i) => ({
      flight: `AC${200 + i}`,
      airline: "Air Canada",
      to: "Calgary",
      scheduled: new Date(Date.now() + i * 30 * 60 * 1000).toISOString(),
      status: i === 0 ? "Boarding" : "On Time",
    })),
    source: "ABD_API",
  };

  return NextResponse.json({
    success: true,
    data: airportData,
    timestamp: new Date().toISOString(),
  });
});
