#!/usr/bin/env tsx

/**
 * Test script to verify that duplicate flight requests are deduplicated
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testFlightDeduplication() {
  console.log("🧪 Testing Flight Request Deduplication");
  console.log("======================================");

  try {
    // 1. Sign in as a test user
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email: "test@example.com", // Replace with a test user email
        password: "testpassword", // Replace with test user password
      });

    if (authError) {
      console.log("❌ Authentication failed:", authError.message);
      console.log("Please create a test user or update credentials");
      return;
    }

    console.log("✅ Authenticated as:", authData.user?.email);

    // 2. Get initial credit balance
    const initialResponse = await fetch(
      "http://localhost:3000/api/credits/balance",
      {
        headers: {
          Authorization: `Bearer ${authData.session?.access_token}`,
        },
      }
    );

    if (!initialResponse.ok) {
      console.log("❌ Failed to get initial balance");
      return;
    }

    const initialBalance = await initialResponse.json();
    console.log(`💰 Initial credits: ${initialBalance.credits}`);

    // 3. Make multiple simultaneous requests to the same flight
    console.log("✈️ Making 3 simultaneous requests to the same flight...");

    const requests = Array.from({ length: 3 }, (_, i) =>
      fetch("http://localhost:3000/api/flights/AF159?dateLocal=2025-01-15", {
        headers: {
          Authorization: `Bearer ${authData.session?.access_token}`,
        },
      }).then(async (response) => {
        const data = await response.json();
        return {
          index: i + 1,
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
          data: data.number || "N/A",
        };
      })
    );

    const results = await Promise.all(requests);

    console.log("📊 Results:");
    results.forEach((result, index) => {
      console.log(
        `  Request ${result.index}: Status ${result.status}, Flight: ${result.data}`
      );
      console.log(
        `    X-Credits-Charged: ${result.headers["x-credits-charged"] || "N/A"}`
      );
      console.log(
        `    X-Credits-Remaining: ${
          result.headers["x-credits-remaining"] || "N/A"
        }`
      );
    });

    // 4. Check final credit balance
    const finalResponse = await fetch(
      "http://localhost:3000/api/credits/balance",
      {
        headers: {
          Authorization: `Bearer ${authData.session?.access_token}`,
        },
      }
    );

    if (finalResponse.ok) {
      const finalBalance = await finalResponse.json();
      console.log(`💰 Final credits: ${finalBalance.credits}`);

      const creditsCharged = initialBalance.credits - finalBalance.credits;
      if (creditsCharged === 1) {
        console.log(
          "✅ SUCCESS: Only 1 credit was charged (deduplication working)"
        );
      } else if (creditsCharged === 3) {
        console.log("❌ PROBLEM: 3 credits were charged (no deduplication)");
      } else {
        console.log(`⚠️ UNEXPECTED: ${creditsCharged} credits were charged`);
      }
    } else {
      console.log("❌ Failed to get final balance");
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run the test
testFlightDeduplication().catch(console.error);
