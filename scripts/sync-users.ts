#!/usr/bin/env tsx

/**
 * Script pour synchroniser les utilisateurs Supabase avec le système de crédits
 * Crée automatiquement les subscriptions et balances pour les utilisateurs existants
 */

// Charger les variables d'environnement
import { config } from "dotenv";
config({ path: ".env.local" });

import { prisma } from "../src/lib/prisma";
import { Plan, SubscriptionStatus } from "@prisma/client";
import { supabaseAdmin } from "../src/lib/supabase/admin";

async function syncUsers() {
  console.log("🔄 Synchronizing Supabase users with credit system...");

  try {
    // Pour l'instant, créons manuellement un utilisateur de test
    // Vous devrez remplacer cet ID par l'ID de votre utilisateur Supabase
    const testUserId = "your-supabase-user-id-here";

    console.log(`📊 Creating subscription for test user: ${testUserId}`);

    let synced = 0;
    let skipped = 0;
    let errors = 0;

    try {
      // Vérifier si l'utilisateur a déjà une subscription
      const existingSubscription = await prisma.subscription.findUnique({
        where: { userId: testUserId },
      });

      if (existingSubscription) {
        console.log(
          `⏭️ User ${testUserId} already has subscription (${existingSubscription.plan})`
        );
        skipped++;
      } else {
        // Créer une subscription FREE par défaut
        const subscription = await prisma.subscription.create({
          data: {
            userId: testUserId,
            plan: Plan.FREE,
            status: SubscriptionStatus.ACTIVE,
            renewsAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Demain pour FREE
          },
        });

        // Créer un solde de crédits initial (5 pour FREE)
        const creditBalance = await prisma.creditBalance.create({
          data: {
            userId: testUserId,
            credits: 5,
          },
        });

        // Ajouter une entrée dans le ledger
        await prisma.creditLedger.create({
          data: {
            userId: testUserId,
            delta: 5,
            reason: "MANUAL_ADJUST",
            metadata: {
              source: "user_sync",
              createdAt: new Date().toISOString(),
            },
          },
        });

        console.log(`✅ Synced user ${testUserId} - 5 credits granted`);
        synced++;
      }
    } catch (error) {
      console.error(`❌ Error syncing user ${testUserId}:`, error);
      errors++;
    }

    console.log("\n📊 Sync Results:");
    console.log(`  - Synced: ${synced} users`);
    console.log(`  - Skipped: ${skipped} users`);
    console.log(`  - Errors: ${errors} users`);

    return { synced, skipped, errors };
  } catch (error) {
    console.error("💥 Fatal error during sync:", error);
    throw error;
  }
}

async function main() {
  const action = process.argv[2] || "sync";

  console.log("🔄 User Sync CLI");
  console.log("================");
  console.log(`Action: ${action}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log("");

  try {
    let result;

    switch (action) {
      case "sync":
        console.log("🔄 Syncing users...");
        result = await syncUsers();
        break;

      default:
        console.log("❌ Invalid action. Available actions:");
        console.log("  - sync: Sync Supabase users with credit system");
        return;
    }

    console.log("\n✅ Result:");
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("\n💥 Error:", error);
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
