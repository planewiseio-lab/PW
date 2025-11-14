#!/usr/bin/env tsx

import { config } from "dotenv";

// Load environment variables
config({ path: ".env.local" });

console.log("🏥 Server Health Check Script");
console.log("=============================");
console.log(`Timestamp: ${new Date().toISOString()}`);
console.log();

async function testServerHealth() {
  const baseUrl = "http://localhost:3000";

  console.log("🔍 Testing server health...");
  console.log();

  // Test 1: Basic server response
  console.log("1️⃣ Testing basic server response...");
  try {
    const response = await fetch(baseUrl, {
      method: "GET",
    });

    console.log(`Status: ${response.status}`);
    if (response.status === 200) {
      console.log("✅ Server is responding");
    } else {
      console.log(`❌ Server error: ${response.status}`);
      const text = await response.text();
      console.log(`Response: ${text.substring(0, 200)}...`);
    }
  } catch (error) {
    console.log("❌ Server not responding:", error);
  }

  console.log();

  // Test 2: API test endpoint
  console.log("2️⃣ Testing API test endpoint...");
  try {
    const response = await fetch(`${baseUrl}/api/test`, {
      method: "GET",
    });

    console.log(`Status: ${response.status}`);
    if (response.status === 200) {
      console.log("✅ API test endpoint working");
    } else {
      console.log(`❌ API test error: ${response.status}`);
      const text = await response.text();
      console.log(`Response: ${text.substring(0, 200)}...`);
    }
  } catch (error) {
    console.log("❌ API test failed:", error);
  }

  console.log();

  // Test 3: Aircraft endpoint
  console.log("3️⃣ Testing aircraft endpoint...");
  try {
    const response = await fetch(`${baseUrl}/api/aircraft/c-frsr`, {
      method: "GET",
    });

    console.log(`Status: ${response.status}`);
    if (response.status === 401) {
      console.log("✅ Aircraft endpoint working (401 - auth required)");
    } else if (response.status === 200) {
      console.log("✅ Aircraft endpoint working (200)");
    } else {
      console.log(`❌ Aircraft endpoint error: ${response.status}`);
      const text = await response.text();
      console.log(`Response: ${text.substring(0, 200)}...`);
    }
  } catch (error) {
    console.log("❌ Aircraft endpoint failed:", error);
  }

  console.log();
  console.log("🎉 Server Health Check Complete!");
  console.log();
  console.log("📋 Summary:");
  console.log(
    "If all endpoints return 500, there's a server configuration issue"
  );
  console.log(
    "If some work and others don't, there are specific endpoint issues"
  );
  console.log("If server doesn't respond, check if 'npm run dev' is running");
}

// Run the test
testServerHealth();
