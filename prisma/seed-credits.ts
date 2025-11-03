import { PrismaClient, Plan, SubscriptionStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function seedCreditsSystem() {
  console.log("🌱 Seeding credit system with test users...");

  // Test users for different plans
  const testUsers = [
    {
      userId: "free-user-123",
      plan: Plan.FREE,
      credits: 5,
      renewsAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago (needs renewal)
    },
    {
      userId: "pro-user-456",
      plan: Plan.PRO,
      credits: 500,
      renewsAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago (needs renewal)
    },
    {
      userId: "basic-user-789",
      plan: Plan.BASIC,
      credits: 2500,
      renewsAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago (needs renewal)
    },
    {
      userId: "admin-user-000",
      plan: Plan.PRO,
      credits: 1000,
      renewsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    },
  ];

  for (const user of testUsers) {
    // Create subscription
    await prisma.subscription.upsert({
      where: { userId: user.userId },
      update: {
        plan: user.plan,
        status: SubscriptionStatus.ACTIVE,
        renewsAt: user.renewsAt,
      },
      create: {
        userId: user.userId,
        plan: user.plan,
        status: SubscriptionStatus.ACTIVE,
        renewsAt: user.renewsAt,
      },
    });

    // Create credit balance
    await prisma.creditBalance.upsert({
      where: { userId: user.userId },
      update: { credits: user.credits },
      create: { userId: user.userId, credits: user.credits },
    });

    // Create initial ledger entry
    await prisma.creditLedger.create({
      data: {
        userId: user.userId,
        delta: user.credits,
        reason: "MANUAL_ADJUST",
        metadata: { note: "Initial seed credits" },
      },
    });

    console.log(
      `✅ Created ${user.plan} user: ${user.userId} (${user.credits} credits)`
    );
  }

  // Create some usage events for testing
  const usageEvents = [
    {
      userId: "free-user-123",
      actionType: "AIRCRAFT_LOOKUP" as const,
      idempotencyKey: "test-usage-1",
      cost: 1,
    },
    {
      userId: "pro-user-456",
      actionType: "VIEW_FLIGHT_HISTORY" as const,
      idempotencyKey: "test-usage-2",
      cost: 1,
    },
    {
      userId: "business-user-789",
      actionType: "BROWSE_FLIGHT" as const,
      idempotencyKey: "test-usage-3",
      cost: 1,
    },
  ];

  for (const event of usageEvents) {
    await prisma.usageEvent.create({
      data: event,
    });
  }

  console.log("🎉 Credit system seeded successfully!");
  console.log("\n📊 Test Users Created:");
  console.log("• FREE user: free-user-123 (5 credits, needs daily renewal)");
  console.log("• PRO user: pro-user-456 (500 credits, needs monthly renewal)");
  console.log(
    "• BASIC user: basic-user-789 (350 credits, needs monthly renewal)"
  );
  console.log("• ADMIN user: admin-user-000 (1000 credits, no renewal needed)");

  console.log("\n🧪 Test the system:");
  console.log("1. Run: npm run test");
  console.log("2. Test API: POST /api/cron/credits-topup");
  console.log("3. Check balances: GET /api/credits/balance");
}

seedCreditsSystem()
  .catch((e) => {
    console.error("❌ Error seeding credit system:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
