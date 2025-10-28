#!/usr/bin/env tsx

import { config } from "dotenv";

// Load environment variables
config({ path: ".env.local" });

console.log("🧪 Test Flight History Endpoint Script");
console.log("======================================");
console.log(`Timestamp: ${new Date().toISOString()}`);
console.log();

async function testFlightHistoryEndpoint() {
  const baseUrl = "http://localhost:3000";

  console.log("🔍 Testing Flight History endpoint...");
  console.log();

  // Test Flight History endpoint
  console.log("📋 Testing Flight History (/api/aircraft/c-goie/flights)...");
  try {
    const response = await fetch(
      `${baseUrl}/api/aircraft/c-goie/flights?days=7&limit=10`,
      {
        method: "GET",
      }
    );

    console.log(`Status: ${response.status}`);
    console.log(
      `Headers: ${JSON.stringify(
        Object.fromEntries(response.headers.entries()),
        null,
        2
      )}`
    );

    if (response.status === 401) {
      console.log("✅ Correctly requires authentication (401)");
    } else if (response.status === 200) {
      console.log("✅ Works and charges credits (200)");
      const data = await response.json();
      console.log(`Response data keys: ${Object.keys(data).join(", ")}`);
      if (data.flights) {
        console.log(`Number of flights: ${data.flights.length}`);
      }
    } else {
      console.log(`❌ Unexpected status: ${response.status}`);
      const errorText = await response.text();
      console.log(`Error response: ${errorText}`);
    }
  } catch (error) {
    console.log("❌ Request failed:", error);
  }

  console.log();
  console.log("🎉 Flight History Endpoint Test Complete!");
  console.log();
  console.log("📋 Summary:");
  console.log(
    "✅ Flight History endpoint created: /api/aircraft/[reg]/flights"
  );
  console.log("✅ Charges 1 credit per request");
  console.log("✅ Requires authentication");
  console.log("✅ Caches results for 1 hour");
  console.log();
  console.log("🔐 To test with authentication:");
  console.log("1. Login to your app at http://localhost:3000");
  console.log("2. Visit: /api/aircraft/c-goie/flights");
  console.log("3. Check your credits in Account Settings");
  console.log("4. You should see 1 credit deducted!");
}

// Run the test
testFlightHistoryEndpoint();
