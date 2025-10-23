#!/usr/bin/env tsx

/**
 * Script de test pour le cron job des crédits FREE
 * Crée des utilisateurs de test et teste le système
 */

// Charger les variables d'environnement
import { config } from "dotenv";
config({ path: ".env.local" });

import { prisma } from "../src/lib/prisma";
import { Plan, SubscriptionStatus } from "@prisma/client";
import {
  refreshFreeCreditsDaily,
  checkFreeCreditsStatus,
} from "../src/lib/cron/refreshFreeCredits";

async function createTestUsers() {
  console.log("🧪 Creating test users...");

  const testUsers = [
    {
      userId: "test-free-1",
      plan: Plan.FREE,
      credits: 2, // Moins de 5 pour tester le renouvellement
    },
    {
      userId: "test-free-2",
      plan: Plan.FREE,
      credits: 0, // Aucun crédit
    },
    {
      userId: "test-pro-1",
      plan: Plan.PRO,
      credits: 100, // Plan PRO (ne doit pas être affecté)
    },
  ];

  for (const user of testUsers) {
    // Créer la subscription
    await prisma.subscription.upsert({
      where: { userId: user.userId },
      update: {
        plan: user.plan,
        status: SubscriptionStatus.ACTIVE,
        renewsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      create: {
        userId: user.userId,
        plan: user.plan,
        status: SubscriptionStatus.ACTIVE,
        renewsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    // Créer le solde de crédits
    await prisma.creditBalance.upsert({
      where: { userId: user.userId },
      update: { credits: user.credits },
      create: { userId: user.userId, credits: user.credits },
    });

    console.log(
      `✅ Created ${user.plan} user: ${user.userId} (${user.credits} credits)`
    );
  }

  return testUsers;
}

async function cleanupTestUsers() {
  console.log("🧹 Cleaning up test users...");

  const testUserIds = ["test-free-1", "test-free-2", "test-pro-1"];

  await prisma.creditLedger.deleteMany({
    where: { userId: { in: testUserIds } },
  });

  await prisma.creditBalance.deleteMany({
    where: { userId: { in: testUserIds } },
  });

  await prisma.subscription.deleteMany({
    where: { userId: { in: testUserIds } },
  });

  console.log("✅ Test users cleaned up");
}

async function main() {
  console.log("🧪 FREE Credits Test Suite");
  console.log("============================");

  try {
    // 1. Créer les utilisateurs de test
    const testUsers = await createTestUsers();

    // 2. Vérifier le statut initial
    console.log("\n📊 Initial status:");
    const initialStatus = await checkFreeCreditsStatus();
    console.log(JSON.stringify(initialStatus, null, 2));

    // 3. Exécuter le cron job
    console.log("\n🔄 Running FREE credits refresh...");
    const result = await refreshFreeCreditsDaily();
    console.log(JSON.stringify(result, null, 2));

    // 4. Vérifier le statut après
    console.log("\n📊 Final status:");
    const finalStatus = await checkFreeCreditsStatus();
    console.log(JSON.stringify(finalStatus, null, 2));

    // 5. Vérifications
    console.log("\n✅ Test Results:");
    console.log(`- FREE users found: ${finalStatus.freeUsers}`);
    console.log(`- Users processed: ${result.processed}`);
    console.log(`- Errors: ${result.errors}`);

    // Vérifier que les utilisateurs FREE ont bien 5 crédits
    const freeUsers = finalStatus.users.filter((user) =>
      testUsers.find((tu) => tu.userId === user.userId && tu.plan === Plan.FREE)
    );

    console.log("\n🔍 FREE users credit check:");
    freeUsers.forEach((user) => {
      const expected = 5;
      const actual = user.credits;
      const status = actual === expected ? "✅" : "❌";
      console.log(
        `${status} ${user.userId}: ${actual} credits (expected: ${expected})`
      );
    });

    // Vérifier que les utilisateurs PRO ne sont pas affectés
    const proUsers = finalStatus.users.filter((user) =>
      testUsers.find((tu) => tu.userId === user.userId && tu.plan === Plan.PRO)
    );

    console.log("\n🔍 PRO users credit check (should be unchanged):");
    proUsers.forEach((user) => {
      const original =
        testUsers.find((tu) => tu.userId === user.userId)?.credits || 0;
      const actual = user.credits;
      const status = actual === original ? "✅" : "❌";
      console.log(
        `${status} ${user.userId}: ${actual} credits (original: ${original})`
      );
    });
  } catch (error) {
    console.error("💥 Test failed:", error);
    throw error;
  } finally {
    // Nettoyer les utilisateurs de test
    await cleanupTestUsers();
  }
}

// Gestion des signaux pour un arrêt propre
process.on("SIGINT", async () => {
  console.log("\n🛑 Test interrupted by user");
  await cleanupTestUsers();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n🛑 Test terminated");
  await cleanupTestUsers();
  process.exit(0);
});

// Exécuter le test
main().catch(async (error) => {
  console.error("💥 Unhandled error:", error);
  await cleanupTestUsers();
  process.exit(1);
});
