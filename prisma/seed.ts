import {
  PrismaClient,
  Plan,
  SubscriptionStatus,
  CreditReason,
  ActionType,
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create test users
  const users = [
    {
      id: "user-free-001",
      email: "free@example.com",
      plan: Plan.FREE,
      status: SubscriptionStatus.ACTIVE,
      credits: 0,
    },
    {
      id: "user-pro-001",
      email: "pro@example.com",
      plan: Plan.PRO,
      status: SubscriptionStatus.ACTIVE,
      credits: 100,
    },
    {
      id: "user-business-001",
      email: "business@example.com",
      plan: Plan.BUSINESS,
      status: SubscriptionStatus.ACTIVE,
      credits: 500,
    },
    {
      id: "admin-001",
      email: "admin@example.com",
      plan: Plan.BUSINESS,
      status: SubscriptionStatus.ACTIVE,
      credits: 1000,
    },
  ];

  for (const user of users) {
    // Create subscription
    const subscription = await prisma.subscription.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        plan: user.plan,
        status: user.status,
        renewsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      },
    });

    // Create credit balance
    await prisma.creditBalance.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        credits: user.credits,
      },
    });

    // Create some sample ledger entries
    if (user.credits > 0) {
      // Initial credit grant
      await prisma.creditLedger.create({
        data: {
          userId: user.id,
          delta: user.credits,
          reason: CreditReason.MONTHLY_TOPUP,
          metadata: { plan: user.plan, initialSetup: true },
        },
      });

      // Some sample usage
      const usageActions = [
        ActionType.AIRCRAFT_LOOKUP,
        ActionType.VIEW_FLIGHT_HISTORY,
        ActionType.BROWSE_FLIGHT,
        ActionType.BROWSE_AIRPORT,
      ];

      for (let i = 0; i < Math.min(user.credits, 10); i++) {
        const actionType = usageActions[i % usageActions.length];

        // Create usage event
        await prisma.usageEvent.create({
          data: {
            userId: user.id,
            actionType,
            idempotencyKey: `${user.id}-${actionType}-${i}-${Date.now()}`,
            cost: 1,
          },
        });

        // Create ledger entry for usage
        await prisma.creditLedger.create({
          data: {
            userId: user.id,
            delta: -1,
            reason: CreditReason.ACTION,
            actionType,
            refId: `action-${i}`,
            metadata: { testData: true },
          },
        });
      }
    }

    console.log(`✅ Created user: ${user.email} (${user.plan})`);
  }

  console.log("🎉 Seeding completed!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
