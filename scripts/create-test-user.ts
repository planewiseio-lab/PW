#!/usr/bin/env tsx

/**
 * Script pour créer un utilisateur de test dans le système de crédits
 * Usage: npm run create:test-user [userId]
 */

// Charger les variables d'environnement
import { config } from "dotenv";
config({ path: ".env.local" });

import { prisma } from "../src/lib/prisma";
import { Plan, SubscriptionStatus } from "@prisma/client";

async function createTestUser(userId: string) {
  console.log(`🔄 Creating test user: ${userId}`);

  try {
    // Vérifier si l'utilisateur existe déjà
    const existingSubscription = await prisma.subscriptions.findUnique({
      where: { userId },
    });

    if (existingSubscription) {
      console.log(
        `⏭️ User ${userId} already has subscription (${existingSubscription.plan})`
      );
      return { success: false, message: "User already exists" };
    }

    // Créer une subscription FREE
    const subscription = await prisma.subscriptions.create({
      data: {
        userId,
        plan: Plan.FREE,
        status: SubscriptionStatus.ACTIVE,
        renewsAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Demain pour FREE
      },
    });

    // Créer un solde de crédits initial (5 pour FREE)
    const creditBalance = await prisma.credit_balances.create({
      data: {
        userId,
        credits: 5,
      },
    });

    // Ajouter une entrée dans le ledger
    await prisma.credit_ledger.create({
      data: {
        userId,
        delta: 5,
        reason: "MANUAL_ADJUST",
        metadata: {
          source: "test_user_creation",
          createdAt: new Date().toISOString(),
        },
      },
    });

    console.log(`✅ Created test user ${userId} with 5 credits`);
    return { success: true, message: "User created successfully" };
  } catch (error) {
    console.error(`❌ Error creating user ${userId}:`, error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function main() {
  const userId = process.argv[2];

  if (!userId) {
    console.log("❌ Please provide a user ID");
    console.log("Usage: npm run create:test-user [userId]");
    console.log(
      "Example: npm run create:test-user 12345678-1234-1234-1234-123456789abc"
    );
    process.exit(1);
  }

  console.log("🧪 Create Test User CLI");
  console.log("======================");
  console.log(`User ID: ${userId}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log("");

  try {
    const result = await createTestUser(userId);

    console.log("\n✅ Result:");
    console.log(JSON.stringify(result, null, 2));

    if (result.success) {
      console.log("\n🎉 Test user created successfully!");
      console.log("You can now run: npm run cron:free-credits:status");
    }
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
