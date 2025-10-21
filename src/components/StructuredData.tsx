"use client";

import { useEffect } from "react";

interface StructuredDataProps {
  type: "aircraft" | "flight" | "airport" | "website";
  data: Record<string, any>;
}

export default function StructuredData({ type, data }: StructuredDataProps) {
  useEffect(() => {
    const script = document.createElement("script");
    script.type = "application/ld+json";

    let structuredData;

    switch (type) {
      case "aircraft":
        structuredData = {
          "@context": "https://schema.org",
          "@type": "Aircraft",
          name: data.registration,
          model: data.model,
          manufacturer: data.manufacturer,
          operator: data.airlineName,
          description: `Aircraft registration ${data.registration}`,
          image: data.photos?.[0] || "/Assets/airplane.jpg",
          url: `https://plane-wise.com/aircraft/${data.registration}`,
        };
        break;

      case "flight":
        structuredData = {
          "@context": "https://schema.org",
          "@type": "Flight",
          flightNumber: data.number,
          departureAirport: {
            "@type": "Airport",
            name: data.departure?.airport?.name,
            iataCode: data.departure?.airport?.iata,
          },
          arrivalAirport: {
            "@type": "Airport",
            name: data.arrival?.airport?.name,
            iataCode: data.arrival?.airport?.iata,
          },
          departureTime: data.departure?.scheduledTime,
          arrivalTime: data.arrival?.scheduledTime,
          aircraft: {
            "@type": "Aircraft",
            name: data.aircraft?.registration,
          },
          airline: {
            "@type": "Airline",
            name: data.airline?.name,
          },
        };
        break;

      case "airport":
        structuredData = {
          "@context": "https://schema.org",
          "@type": "Airport",
          name: data.name,
          iataCode: data.iata,
          icaoCode: data.icao,
          address: {
            "@type": "PostalAddress",
            addressCountry: data.country?.name,
            addressLocality: data.city?.name,
          },
          geo: {
            "@type": "GeoCoordinates",
            latitude: data.location?.lat,
            longitude: data.location?.lon,
          },
        };
        break;

      case "website":
        structuredData = {
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "PlaneWise",
          description:
            "Professional aviation data platform for aircraft registration lookup, flight tracking, and airport information.",
          url: "https://plane-wise.com",
          potentialAction: {
            "@type": "SearchAction",
            target: "https://plane-wise.com/search?q={search_term_string}",
            "query-input": "required name=search_term_string",
          },
        };
        break;

      default:
        return;
    }

    script.textContent = JSON.stringify(structuredData);
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, [type, data]);

  return null;
}




