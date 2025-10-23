#!/usr/bin/env tsx

/**
 * Script pour tester la limite de crédits avec un utilisateur qui a déjà 5 crédits
 * Doit vérifier qu'aucun crédit n'est ajouté
 */

// Charger les variables d'environnement
import { config } from "dotenv";
config({ path: ".env.local" });

import { prisma } from "../src/lib/prisma";
import { Plan, SubscriptionStatus } from "@prisma/client";
import { forceRefreshFreeCredits } from "../src/lib/cron/refreshFreeCredits";

async function createTestUserWithCredits(userId: string, credits: number) {
  console.log(`🔄 Creating test user: ${userId} with ${credits} credits`);

  try {
    // Créer une subscription FREE
    await prisma.subscription.upsert({
      where: { userId },
      update: {
        plan: Plan.FREE,
        status: SubscriptionStatus.ACTIVE,
        renewsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
      create: {
        userId,
        plan: Plan.FREE,
        status: SubscriptionStatus.ACTIVE,
        renewsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    // Créer un solde de crédits avec le nombre spécifié
    await prisma.creditBalance.upsert({
      where: { userId },
      update: { credits },
      create: { userId, credits },
    });

    console.log(`✅ Created test user ${userId} with ${credits} credits`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Error creating user ${userId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function testCreditLimitMax() {
  console.log("🧪 Testing Credit Limit with Max Credits (5)");
  console.log("=============================================");

  const testUserId = "test-max-user";

  try {
    // 1. Créer un utilisateur avec 5 crédits (maximum)
    console.log("\n1. Creating user with 5 credits (max)...");
    await createTestUserWithCredits(testUserId, 5);

    // 2. Vérifier le statut initial
    console.log("\n2. Checking initial status...");
    const initialBalance = await prisma.creditBalance.findUnique({
      where: { userId: testUserId },
      select: { credits: true },
    });
    console.log(`Initial credits: ${initialBalance?.credits ?? 0}`);

    // 3. Exécuter le cron job (force)
    console.log("\n3. Running cron job (force mode)...");
    const result = await forceRefreshFreeCredits();
    console.log("Cron result:", result);

    // 4. Vérifier le solde final
    console.log("\n4. Checking final status...");
    const finalBalance = await prisma.creditBalance.findUnique({
      where: { userId: testUserId },
      select: { credits: true },
    });
    console.log(`Final credits: ${finalBalance?.credits ?? 0}`);

    // 5. Vérifier le ledger
    console.log("\n5. Checking ledger entries...");
    const ledgerEntries = await prisma.creditLedger.findMany({
      where: { userId: testUserId },
      orderBy: { createdAt: "desc" },
      take: 3,
    });

    console.log("Recent ledger entries:");
    ledgerEntries.forEach((entry) => {
      console.log(
        `  - ${entry.createdAt.toISOString()}: ${entry.delta > 0 ? "+" : ""}${
          entry.delta
        } (${entry.reason})`
      );
    });

    // 6. Nettoyer
    console.log("\n6. Cleaning up...");
    await prisma.creditLedger.deleteMany({ where: { userId: testUserId } });
    await prisma.creditBalance.deleteMany({ where: { userId: testUserId } });
    await prisma.subscription.deleteMany({ where: { userId: testUserId } });
    console.log("✅ Cleanup completed");

    console.log("\n🎉 Test completed successfully!");
    console.log(`Expected: 5 credits (no change)`);
    console.log(`Actual: ${finalBalance?.credits ?? 0} credits`);

    if (finalBalance?.credits === 5) {
      console.log(
        "✅ Test PASSED: Credits correctly maintained at 5 (no unnecessary addition)"
      );
    } else {
      console.log("❌ Test FAILED: Credits changed when they shouldn't have");
    }
  } catch (error) {
    console.error("💥 Test failed:", error);

    // Nettoyer en cas d'erreur
    try {
      await prisma.creditLedger.deleteMany({ where: { userId: testUserId } });
      await prisma.creditBalance.deleteMany({ where: { userId: testUserId } });
      await prisma.subscription.deleteMany({ where: { userId: testUserId } });
    } catch (cleanupError) {
      console.error("Error during cleanup:", cleanupError);
    }

    throw error;
  }
}

// Exécuter le test
testCreditLimitMax().catch((error) => {
  console.error("💥 Unhandled error:", error);
  process.exit(1);
});
