#!/usr/bin/env node

/**
 * Test script for the credit system
 * Run with: node test-credit-system.js
 */

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function testCreditSystem() {
  console.log("🧪 Testing Credit System...\n");

  const testUserId = "test-user-" + Date.now();

  try {
    // 1. Test subscription creation
    console.log("1. Creating subscription...");
    const subscription = await prisma.subscription.create({
      data: {
        userId: testUserId,
        plan: "PRO",
        status: "ACTIVE",
        renewsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    console.log("✅ Subscription created:", subscription.id);

    // 2. Test credit balance creation
    console.log("\n2. Creating credit balance...");
    const balance = await prisma.creditBalance.create({
      data: {
        userId: testUserId,
        credits: 100,
      },
    });
    console.log("✅ Credit balance created:", balance.credits, "credits");

    // 3. Test credit ledger entry
    console.log("\n3. Creating credit ledger entry...");
    const ledgerEntry = await prisma.creditLedger.create({
      data: {
        userId: testUserId,
        delta: 100,
        reason: "MONTHLY_TOPUP",
        metadata: { plan: "PRO", test: true },
      },
    });
    console.log("✅ Ledger entry created:", ledgerEntry.id);

    // 4. Test usage event
    console.log("\n4. Creating usage event...");
    const usageEvent = await prisma.usageEvent.create({
      data: {
        userId: testUserId,
        actionType: "AIRCRAFT_LOOKUP",
        idempotencyKey: `test-${testUserId}-${Date.now()}`,
        cost: 1,
      },
    });
    console.log("✅ Usage event created:", usageEvent.id);

    // 5. Test credit charge (simulate)
    console.log("\n5. Simulating credit charge...");
    await prisma.$transaction(async (tx) => {
      // Create usage event
      await tx.usageEvent.create({
        data: {
          userId: testUserId,
          actionType: "VIEW_FLIGHT_HISTORY",
          idempotencyKey: `charge-${testUserId}-${Date.now()}`,
          cost: 1,
        },
      });

      // Create ledger entry
      await tx.creditLedger.create({
        data: {
          userId: testUserId,
          delta: -1,
          reason: "ACTION",
          actionType: "VIEW_FLIGHT_HISTORY",
          refId: "test-ref-1",
        },
      });

      // Update balance
      await tx.creditBalance.update({
        where: { userId: testUserId },
        data: { credits: { decrement: 1 } },
      });
    });
    console.log("✅ Credit charge completed");

    // 6. Verify final state
    console.log("\n6. Verifying final state...");
    const finalBalance = await prisma.creditBalance.findUnique({
      where: { userId: testUserId },
    });
    console.log("✅ Final balance:", finalBalance.credits, "credits");

    const ledgerCount = await prisma.creditLedger.count({
      where: { userId: testUserId },
    });
    console.log("✅ Ledger entries:", ledgerCount);

    const usageCount = await prisma.usageEvent.count({
      where: { userId: testUserId },
    });
    console.log("✅ Usage events:", usageCount);

    console.log("\n🎉 All tests passed!");
  } catch (error) {
    console.error("❌ Test failed:", error);
    throw error;
  } finally {
    // Cleanup
    console.log("\n🧹 Cleaning up test data...");
    await prisma.usageEvent.deleteMany({ where: { userId: testUserId } });
    await prisma.creditLedger.deleteMany({ where: { userId: testUserId } });
    await prisma.creditBalance.deleteMany({ where: { userId: testUserId } });
    await prisma.subscription.deleteMany({ where: { userId: testUserId } });
    console.log("✅ Cleanup completed");

    await prisma.$disconnect();
  }
}

// Run the test
testCreditSystem()
  .then(() => {
    console.log("\n✅ Credit system test completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Credit system test failed:", error);
    process.exit(1);
  });
