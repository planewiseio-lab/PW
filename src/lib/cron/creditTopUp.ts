import { prisma } from "@/lib/prisma";
import { ensureMonthlyTopUp } from "@/lib/credits";
import { Plan, SubscriptionStatus } from "@prisma/client";

/**
 * Cron job to handle credit top-ups based on subscription plans
 *
 * FREE: Daily top-up (5 credits)
 * PRO: Monthly top-up (500 credits)
 * BUSINESS: Monthly top-up (2500 credits)
 */
export async function runCreditTopUpCron() {
  console.log("[CRON] Starting credit top-up process...");

  try {
    // Get all active subscriptions that need renewal
    const subscriptions = await prisma.subscriptions.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        renewsAt: {
          lte: new Date(), // renewsAt <= now
        },
      },
      select: {
        userId: true,
        plan: true,
        renewsAt: true,
      },
    });

    console.log(
      `[CRON] Found ${subscriptions.length} subscriptions needing renewal`
    );

    const results = {
      processed: 0,
      errors: 0,
      byPlan: {
        [Plan.FREE]: 0,
        [Plan.PRO]: 0,
        [Plan.BUSINESS]: 0,
      },
    };

    // Process each subscription
    for (const subscription of subscriptions) {
      try {
        await ensureMonthlyTopUp(subscription.userId);
        results.processed++;
        results.byPlan[subscription.plan]++;

        console.log(
          `[CRON] ✅ Top-up applied for user ${subscription.userId} (${subscription.plan})`
        );
      } catch (error) {
        results.errors++;
        console.error(
          `[CRON] ❌ Failed to top-up user ${subscription.userId}:`,
          error
        );
      }
    }

    console.log("[CRON] Credit top-up process completed:", results);
    return results;
  } catch (error) {
    console.error("[CRON] Fatal error in credit top-up process:", error);
    throw error;
  }
}

/**
 * Manual trigger for testing (can be called from API)
 */
export async function triggerCreditTopUp() {
  console.log("[MANUAL] Triggering credit top-up...");
  return await runCreditTopUpCron();
}
