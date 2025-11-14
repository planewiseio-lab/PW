#!/usr/bin/env tsx

/**
 * Script CLI pour tester le cron job des crédits FREE
 * Usage: npm run cron:free-credits [action]
 *
 * Actions disponibles:
 * - refresh: Renouveler les crédits FREE (par défaut)
 * - status: Vérifier le statut des crédits FREE
 * - force: Forcer le renouvellement (bypass idempotence)
 * - monitor: Surveiller les cron jobs
 */

// Charger les variables d'environnement
import { config } from "dotenv";
config({ path: ".env.local" });

import {
  refreshFreeCreditsDaily,
  checkFreeCreditsStatus,
  forceRefreshFreeCredits,
} from "../src/lib/cron/refreshFreeCredits";
import { monitorCronJobs } from "../src/lib/cron/scheduler";

async function main() {
  const action = process.argv[2] || "refresh";

  console.log("🕐 FREE Credits Cron Job CLI");
  console.log("================================");
  console.log(`Action: ${action}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log("");

  try {
    let result;

    switch (action) {
      case "refresh":
        console.log("🔄 Refreshing FREE credits...");
        result = await refreshFreeCreditsDaily();
        break;

      case "status":
        console.log("📊 Checking FREE credits status...");
        result = await checkFreeCreditsStatus();
        break;

      case "force":
        console.log("🔨 Force refreshing FREE credits...");
        result = await forceRefreshFreeCredits();
        break;

      case "monitor":
        console.log("🔍 Monitoring cron jobs...");
        result = await monitorCronJobs();
        break;

      default:
        console.log("❌ Invalid action. Available actions:");
        console.log("  - refresh: Refresh FREE credits (default)");
        console.log("  - status: Check FREE credits status");
        console.log("  - force: Force refresh (bypass idempotence)");
        console.log("  - monitor: Monitor cron jobs");
        process.exit(1);
    }

    console.log("");
    console.log("✅ Result:");
    console.log(JSON.stringify(result, null, 2));

    if (action === "refresh" || action === "force") {
      if ("success" in result && result.success) {
        console.log("");
        console.log(`🎉 Successfully processed ${result.processed} users`);
        if ("errors" in result && result.errors && result.errors > 0) {
          console.log(`⚠️ ${result.errors} errors occurred`);
        }
      } else {
        console.log("");
        console.log("❌ Operation failed");
        process.exit(1);
      }
    }
  } catch (error) {
    console.error("");
    console.error("💥 Fatal error:");
    console.error(error);
    process.exit(1);
  }
}

// Gestion des signaux pour un arrêt propre
process.on("SIGINT", () => {
  console.log("\n🛑 Script interrupted by user");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n🛑 Script terminated");
  process.exit(0);
});

// Exécuter le script
main().catch((error) => {
  console.error("💥 Unhandled error:", error);
  process.exit(1);
});
