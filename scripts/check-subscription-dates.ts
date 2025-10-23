#!/usr/bin/env tsx

/**
 * Script pour vérifier les dates de subscription dans la base de données
 */

// Charger les variables d'environnement
import { config } from "dotenv";
config({ path: ".env.local" });

import { prisma } from "../src/lib/prisma";

async function checkSubscriptionDates() {
  console.log("🔍 Checking subscription dates...");

  try {
    const subscriptions = await prisma.subscription.findMany({
      where: {
        plan: "FREE",
      },
      select: {
        userId: true,
        plan: true,
        renewsAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    console.log(`Found ${subscriptions.length} FREE subscriptions:`);
    console.log("");

    subscriptions.forEach((sub, index) => {
      console.log(`${index + 1}. User: ${sub.userId}`);
      console.log(`   Plan: ${sub.plan}`);
      console.log(`   Created: ${sub.createdAt.toISOString()}`);
      console.log(`   Renews At: ${sub.renewsAt.toISOString()}`);
      console.log(`   Renews At (Local): ${sub.renewsAt.toLocaleString()}`);
      console.log(`   Updated: ${sub.updatedAt.toISOString()}`);
      console.log("");
    });

    // Vérifier la date actuelle
    const now = new Date();
    console.log(`Current time: ${now.toISOString()}`);
    console.log(`Current time (Local): ${now.toLocaleString()}`);

    // Vérifier les subscriptions qui devraient être renouvelées
    const expiredSubscriptions = subscriptions.filter(
      (sub) => sub.renewsAt <= now
    );
    console.log(
      `\nSubscriptions that should be renewed: ${expiredSubscriptions.length}`
    );

    if (expiredSubscriptions.length > 0) {
      console.log("Expired subscriptions:");
      expiredSubscriptions.forEach((sub) => {
        console.log(`  - ${sub.userId}: ${sub.renewsAt.toISOString()}`);
      });
    }
  } catch (error) {
    console.error("❌ Error checking subscriptions:", error);
  }
}

// Exécuter le script
checkSubscriptionDates().catch((error) => {
  console.error("💥 Unhandled error:", error);
  process.exit(1);
});
