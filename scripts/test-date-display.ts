#!/usr/bin/env tsx

/**
 * Script pour tester l'affichage des dates
 */

// Charger les variables d'environnement
import { config } from "dotenv";
config({ path: ".env.local" });

import { prisma } from "../src/lib/prisma";

async function testDateDisplay() {
  console.log("🧪 Testing Date Display");
  console.log("=======================");

  try {
    // Récupérer une subscription
    const subscription = await prisma.subscription.findFirst({
      where: { plan: "FREE" },
      select: { renewsAt: true },
    });

    if (!subscription) {
      console.log("❌ No subscription found");
      return;
    }

    console.log("Raw renewsAt from database:", subscription.renewsAt);
    console.log("Type:", typeof subscription.renewsAt);
    console.log("");

    // Test différentes méthodes d'affichage
    const date = new Date(subscription.renewsAt);

    console.log("Different display methods:");
    console.log("1. toISOString():", date.toISOString());
    console.log("2. toLocaleDateString():", date.toLocaleDateString());
    console.log(
      "3. toLocaleDateString('en-CA'):",
      date.toLocaleDateString("en-CA")
    );
    console.log(
      "4. toLocaleDateString('en-CA', { timeZone: 'America/Toronto' }):",
      date.toLocaleDateString("en-CA", { timeZone: "America/Toronto" })
    );
    console.log(
      "5. toLocaleDateString('en-CA', { timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit' }):",
      date.toLocaleDateString("en-CA", {
        timeZone: "America/Toronto",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
    );

    console.log("");
    console.log("Current time:");
    console.log("- UTC:", new Date().toISOString());
    console.log("- Local:", new Date().toLocaleString());
    console.log(
      "- Toronto:",
      new Date().toLocaleString("en-CA", { timeZone: "America/Toronto" })
    );
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

// Exécuter le test
testDateDisplay().catch((error) => {
  console.error("💥 Unhandled error:", error);
  process.exit(1);
});
