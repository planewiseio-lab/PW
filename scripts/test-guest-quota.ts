#!/usr/bin/env tsx

import { config } from "dotenv";

// Load environment variables
config({ path: ".env.local" });

console.log("🎭 Guest Quota Test Script");
console.log("==========================");
console.log(`Timestamp: ${new Date().toISOString()}`);
console.log();

async function testGuestQuota() {
  const baseUrl = "http://localhost:3000";

  console.log("🔍 Testing Guest Quota System...");
  console.log();

  // Test 1: First request (should work)
  console.log("1️⃣ Testing first guest request...");
  try {
    const response = await fetch(`${baseUrl}/api/aircraft/lookup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "192.168.1.100", // Simulate guest IP
      },
      body: JSON.stringify({ registration: "C-FRSR" }),
    });

    console.log(`Status: ${response.status}`);
    console.log(
      `Headers: ${JSON.stringify(
        Object.fromEntries(response.headers.entries()),
        null,
        2
      )}`
    );

    if (response.status === 200) {
      const data = await response.json();
      console.log("✅ First request successful");
      console.log(`Guest remaining: ${data.guestRemaining || "N/A"}`);
      console.log(`Is guest: ${data.isGuest || "N/A"}`);
    } else if (response.status === 401) {
      console.log("❌ Still getting 401 - guest quota not working");
      const errorText = await response.text();
      console.log(`Error: ${errorText}`);
    } else if (response.status === 429) {
      console.log("⚠️ Getting 429 - quota already exceeded");
      const errorText = await response.text();
      console.log(`Error: ${errorText}`);
    } else {
      console.log(`❌ Unexpected status: ${response.status}`);
      const errorText = await response.text();
      console.log(`Response: ${errorText}`);
    }
  } catch (error) {
    console.log("❌ Request failed:", error);
  }

  console.log();

  // Test 2: Second request
  console.log("2️⃣ Testing second guest request...");
  try {
    const response = await fetch(`${baseUrl}/api/aircraft/lookup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "192.168.1.100", // Same IP
      },
      body: JSON.stringify({ registration: "C-GOIE" }),
    });

    console.log(`Status: ${response.status}`);
    if (response.status === 200) {
      const data = await response.json();
      console.log("✅ Second request successful");
      console.log(`Guest remaining: ${data.guestRemaining || "N/A"}`);
    } else {
      console.log(`❌ Second request failed: ${response.status}`);
    }
  } catch (error) {
    console.log("❌ Second request failed:", error);
  }

  console.log();

  // Test 3: Third request
  console.log("3️⃣ Testing third guest request...");
  try {
    const response = await fetch(`${baseUrl}/api/aircraft/lookup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "192.168.1.100", // Same IP
      },
      body: JSON.stringify({ registration: "C-GABC" }),
    });

    console.log(`Status: ${response.status}`);
    if (response.status === 200) {
      const data = await response.json();
      console.log("✅ Third request successful");
      console.log(`Guest remaining: ${data.guestRemaining || "N/A"}`);
    } else {
      console.log(`❌ Third request failed: ${response.status}`);
    }
  } catch (error) {
    console.log("❌ Third request failed:", error);
  }

  console.log();

  // Test 4: Fourth request (should be blocked)
  console.log("4️⃣ Testing fourth guest request (should be blocked)...");
  try {
    const response = await fetch(`${baseUrl}/api/aircraft/lookup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "192.168.1.100", // Same IP
      },
      body: JSON.stringify({ registration: "C-GDEF" }),
    });

    console.log(`Status: ${response.status}`);
    if (response.status === 429) {
      const data = await response.json();
      console.log("✅ Fourth request correctly blocked (429)");
      console.log(`Error: ${data.error}`);
      console.log(`Message: ${data.message}`);
    } else if (response.status === 200) {
      console.log("⚠️ Fourth request still allowed - quota system not working");
    } else {
      console.log(`❌ Unexpected status: ${response.status}`);
    }
  } catch (error) {
    console.log("❌ Fourth request failed:", error);
  }

  console.log();
  console.log("🎉 Guest Quota Test Complete!");
  console.log();
  console.log("📋 Summary:");
  console.log("✅ First 3 requests should work (200)");
  console.log("❌ 4th request should be blocked (429)");
  console.log("🔧 If all return 401, the guest quota system is not active");
}

// Run the test
testGuestQuota();
