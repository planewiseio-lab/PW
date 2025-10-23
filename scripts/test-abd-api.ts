#!/usr/bin/env tsx

import { config } from "dotenv";

// Load environment variables
config({ path: ".env.local" });

console.log("🧪 ABD API Test Script");
console.log("=====================");
console.log(`Timestamp: ${new Date().toISOString()}`);
console.log();

async function testABDAPI() {
  const baseUrl = "http://localhost:3000";

  console.log("🔍 Testing ABD API endpoints...");
  console.log();

  // Test aircraft lookup
  console.log("1️⃣ Testing /api/aircraft/lookup...");
  try {
    const response = await fetch(`${baseUrl}/api/aircraft/lookup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        registration: "C-FRSR",
      }),
    });

    console.log(`Status: ${response.status}`);
    console.log(`Headers:`, Object.fromEntries(response.headers.entries()));

    if (response.status === 401) {
      console.log("✅ Correctly requires authentication");
    } else if (response.status === 200) {
      const data = await response.json();
      console.log("✅ Response:", data);
    } else {
      const error = await response.text();
      console.log("❌ Error:", error);
    }
  } catch (error) {
    console.log("❌ Request failed:", error);
  }

  console.log();

  // Test flight history
  console.log("2️⃣ Testing /api/flights/history...");
  try {
    const response = await fetch(
      `${baseUrl}/api/flights/history?aircraftId=test&limit=5`,
      {
        method: "GET",
      }
    );

    console.log(`Status: ${response.status}`);
    console.log(`Headers:`, Object.fromEntries(response.headers.entries()));

    if (response.status === 401) {
      console.log("✅ Correctly requires authentication");
    } else if (response.status === 200) {
      const data = await response.json();
      console.log("✅ Response:", data);
    } else {
      const error = await response.text();
      console.log("❌ Error:", error);
    }
  } catch (error) {
    console.log("❌ Request failed:", error);
  }

  console.log();

  // Test flight browse
  console.log("3️⃣ Testing /api/flights/browse...");
  try {
    const response = await fetch(
      `${baseUrl}/api/flights/browse?flightNumber=AC123`,
      {
        method: "GET",
      }
    );

    console.log(`Status: ${response.status}`);
    console.log(`Headers:`, Object.fromEntries(response.headers.entries()));

    if (response.status === 401) {
      console.log("✅ Correctly requires authentication");
    } else if (response.status === 200) {
      const data = await response.json();
      console.log("✅ Response:", data);
    } else {
      const error = await response.text();
      console.log("❌ Error:", error);
    }
  } catch (error) {
    console.log("❌ Request failed:", error);
  }

  console.log();

  // Test airport browse
  console.log("4️⃣ Testing /api/airports/browse...");
  try {
    const response = await fetch(`${baseUrl}/api/airports/browse?icao=CYYZ`, {
      method: "GET",
    });

    console.log(`Status: ${response.status}`);
    console.log(`Headers:`, Object.fromEntries(response.headers.entries()));

    if (response.status === 401) {
      console.log("✅ Correctly requires authentication");
    } else if (response.status === 200) {
      const data = await response.json();
      console.log("✅ Response:", data);
    } else {
      const error = await response.text();
      console.log("❌ Error:", error);
    }
  } catch (error) {
    console.log("❌ Request failed:", error);
  }

  console.log();
  console.log("🎉 ABD API Test Complete!");
  console.log();
  console.log("📋 Expected Results:");
  console.log(
    "- All endpoints should return 401 (Unauthorized) without authentication"
  );
  console.log(
    "- All endpoints should include X-Credits-* headers when authenticated"
  );
  console.log("- All endpoints should charge 1 credit per request");
  console.log();
  console.log("🔐 To test with authentication, you need to:");
  console.log("1. Login to the app in your browser");
  console.log("2. Copy the session cookie");
  console.log("3. Add it to the requests");
}

// Run the test
testABDAPI();
