import { prisma } from "../../src/lib/prisma";
import { ensureMonthlyTopUp } from "../../src/lib/credits";

/**
 * Cron job to ensure monthly top-ups are applied
 * Run this daily to check for subscriptions that need renewal
 */
export async function runMonthlyTopUpCron() {
  console.log("🔄 Running monthly top-up cron job...");

  try {
    // Find all active subscriptions that need renewal
    const now = new Date();
    const subscriptions = await prisma.subscription.findMany({
      where: {
        status: "ACTIVE",
        renewsAt: {
          lte: now,
        },
      },
    });

    console.log(
      `📊 Found ${subscriptions.length} subscriptions needing renewal`
    );

    for (const subscription of subscriptions) {
      try {
        console.log(
          `🔄 Processing renewal for user ${subscription.userId} (${subscription.plan})`
        );
        await ensureMonthlyTopUp(subscription.userId);
        console.log(
          `✅ Successfully renewed subscription for user ${subscription.userId}`
        );
      } catch (error) {
        console.error(
          `❌ Failed to renew subscription for user ${subscription.userId}:`,
          error
        );
      }
    }

    console.log("✅ Monthly top-up cron job completed");
  } catch (error) {
    console.error("❌ Monthly top-up cron job failed:", error);
    throw error;
  }
}

// If running directly (for testing)
if (require.main === module) {
  runMonthlyTopUpCron()
    .then(() => {
      console.log("Cron job completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Cron job failed:", error);
      process.exit(1);
    });
}
