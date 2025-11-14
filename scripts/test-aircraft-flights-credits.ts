#!/usr/bin/env tsx

/**
 * Test script to verify that aircraft flights endpoint charges credits
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testAircraftFlightsCredits() {
  console.log("🧪 Testing Aircraft Flights Credit Charging");
  console.log("==========================================");

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

    // 3. Call aircraft flights endpoint
    console.log("🛩️ Calling aircraft flights endpoint...");
    const flightsResponse = await fetch(
      "http://localhost:3000/api/aircraft/C-GABC/flights?days=7",
      {
        headers: {
          Authorization: `Bearer ${authData.session?.access_token}`,
        },
      }
    );

    console.log(`📊 Response status: ${flightsResponse.status}`);
    console.log(
      `📊 Response headers:`,
      Object.fromEntries(flightsResponse.headers.entries())
    );

    if (flightsResponse.ok) {
      const flightsData = await flightsResponse.json();
      console.log(`📊 Flights found: ${flightsData.flights?.length || 0}`);
    } else {
      const errorData = await flightsResponse.json();
      console.log("❌ Error response:", errorData);
    }

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
        console.log("✅ SUCCESS: 1 credit was charged correctly");
      } else if (creditsCharged === 0) {
        console.log("❌ PROBLEM: No credits were charged");
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
testAircraftFlightsCredits().catch(console.error);
