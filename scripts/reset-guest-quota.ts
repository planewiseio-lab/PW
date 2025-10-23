#!/usr/bin/env tsx

import { config } from "dotenv";

// Load environment variables
config({ path: ".env.local" });

console.log("🔄 Guest Quota Reset Script");
console.log("===========================");
console.log(`Timestamp: ${new Date().toISOString()}`);
console.log();

async function resetGuestQuota() {
  // Import the reset function
  const { resetGuestQuota } = await import("../src/lib/guestQuota");

  console.log("🔧 Resetting guest quota for test IP...");

  // Reset quota for the test IP
  await resetGuestQuota("192.168.1.100");

  console.log("✅ Guest quota reset for IP: 192.168.1.100");
  console.log("🎯 You can now test with 3 fresh requests");
}

// Run the reset
resetGuestQuota();
