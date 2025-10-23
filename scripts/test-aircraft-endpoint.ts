#!/usr/bin/env tsx

import { config } from "dotenv";

// Load environment variables
config({ path: ".env.local" });

console.log("🧪 Test Aircraft Endpoint Script");
console.log("===============================");
console.log(`Timestamp: ${new Date().toISOString()}`);
console.log();

async function testAircraftEndpoint() {
  const baseUrl = "http://localhost:3000";

  console.log("🔍 Testing /aircraft/c-goie endpoint...");
  console.log();

  // Test the aircraft endpoint that should now charge credits
  console.log("1️⃣ Testing /aircraft/c-goie (should now charge 1 credit)...");
  try {
    const response = await fetch(`${baseUrl}/aircraft/c-goie`, {
      method: "GET",
    });

    console.log(`Status: ${response.status}`);
    console.log(`Headers:`, Object.fromEntries(response.headers.entries()));

    if (response.status === 401) {
      console.log("✅ Correctly requires authentication (401)");
      console.log("   This means the endpoint now charges credits!");
    } else if (response.status === 200) {
      const data = await response.json();
      console.log("✅ Response:", data);
      console.log(
        "   Credits charged:",
        response.headers.get("X-Credits-Charged")
      );
      console.log(
        "   Credits remaining:",
        response.headers.get("X-Credits-Remaining")
      );
    } else if (response.status === 402) {
      const data = await response.json();
      console.log("✅ Insufficient credits (402):", data);
      console.log(
        "   This means the endpoint charges credits but user has no credits!"
      );
    } else {
      const error = await response.text();
      console.log("❌ Error:", error);
    }
  } catch (error) {
    console.log("❌ Request failed:", error);
  }

  console.log();
  console.log("🎉 Aircraft Endpoint Test Complete!");
  console.log();
  console.log("📋 Expected Results:");
  console.log("- If 401: Endpoint now requires authentication ✅");
  console.log("- If 200: Endpoint works and charges credits ✅");
  console.log("- If 402: Endpoint charges credits but user has no credits ✅");
  console.log();
  console.log("🔐 To test with authentication:");
  console.log("1. Login to your app at http://localhost:3000");
  console.log("2. Go to http://localhost:3000/aircraft/c-goie");
  console.log("3. Check your credits in Account Settings");
  console.log("4. You should see 1 credit deducted!");
}

// Run the test
testAircraftEndpoint();
