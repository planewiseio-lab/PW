import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables from .env.local
config({ path: resolve(__dirname, "../.env.local") });

import { prisma } from "../src/lib/prisma";

async function deleteUserData(userId: string) {
  console.log(`🗑️  Deleting all data for user: ${userId}`);
  console.log("");

  try {
    // 1. Supprimer les entrées du ledger (historique des crédits)
    console.log("📝 Deleting credit ledger entries...");
    const ledgerResult = await prisma.credit_ledger.deleteMany({
      where: { userId },
    });
    console.log(`   ✅ Deleted ${ledgerResult.count} ledger entries`);

    // 2. Supprimer les événements d'utilisation
    console.log("📊 Deleting usage events...");
    const usageResult = await prisma.usage_events.deleteMany({
      where: { userId },
    });
    console.log(`   ✅ Deleted ${usageResult.count} usage events`);

    // 3. Supprimer le solde de crédits
    console.log("💰 Deleting credit balance...");
    const balanceResult = await prisma.credit_balances.deleteMany({
      where: { userId },
    });
    console.log(`   ✅ Deleted ${balanceResult.count} credit balance`);

    // 4. Supprimer la subscription
    console.log("📋 Deleting subscription...");
    const subscriptionResult = await prisma.subscriptions.deleteMany({
      where: { userId },
    });
    console.log(`   ✅ Deleted ${subscriptionResult.count} subscription`);

    // 5. Supprimer le profil (optionnel, si existe)
    console.log("👤 Deleting profile...");
    try {
      const profileResult = await prisma.profiles.deleteMany({
        where: { id: userId },
      });
      console.log(`   ✅ Deleted ${profileResult.count} profile`);
    } catch (profileError) {
      console.log(`   ⚠️  Profile deletion skipped (may not exist): ${profileError instanceof Error ? profileError.message : "Unknown error"}`);
    }

    console.log("");
    console.log("✅ All user data deleted successfully!");
    console.log("");
    console.log("Summary:");
    console.log(`   - Ledger entries: ${ledgerResult.count}`);
    console.log(`   - Usage events: ${usageResult.count}`);
    console.log(`   - Credit balance: ${balanceResult.count}`);
    console.log(`   - Subscription: ${subscriptionResult.count}`);

  } catch (error) {
    console.error("❌ Error deleting user data:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const userId = process.argv[2];

  if (!userId) {
    console.error("❌ Please provide a user ID as argument");
    console.log("Usage: tsx scripts/delete-user-data.ts <userId>");
    process.exit(1);
  }

  // Confirmation
  console.log("⚠️  WARNING: This will permanently delete all data for user:", userId);
  console.log("   This includes:");
  console.log("   - Subscription");
  console.log("   - Credit balance");
  console.log("   - Credit ledger (all history)");
  console.log("   - Usage events");
  console.log("   - Profile (if exists)");
  console.log("");
  console.log("This action cannot be undone!");
  console.log("");

  await deleteUserData(userId);
}

main()
  .then(() => {
    console.log("✅ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });

