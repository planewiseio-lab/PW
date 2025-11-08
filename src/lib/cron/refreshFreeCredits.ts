import { prisma } from "@/lib/prisma";
import { Plan, SubscriptionStatus } from "@prisma/client";
import { ensureMonthlyTopUp } from "@/lib/credits";

/**
 * Cron job pour renouveler les crédits des utilisateurs FREE mensuellement
 * S'exécute quotidiennement mais ne renouvelle que les utilisateurs dont renewsAt est passé
 * Utilise ensureMonthlyTopUp qui vérifie la date de renouvellement et renouvelle à 50 crédits
 */
export async function refreshFreeCreditsDaily() {
  console.log("[CRON] 🕐 Starting FREE credits monthly renewal check...");

  try {
    // Récupérer tous les utilisateurs FREE dont la date de renouvellement est passée
    const freeUsersNeedingRenewal = await prisma.subscriptions.findMany({
      where: {
        plan: Plan.FREE,
        status: SubscriptionStatus.ACTIVE,
        renewsAt: {
          lte: new Date(), // renewsAt <= now (besoin de renouvellement)
        },
      },
      select: {
        userId: true,
        renewsAt: true,
      },
    });

    console.log(`[CRON] 📊 Found ${freeUsersNeedingRenewal.length} FREE users needing monthly renewal`);

    if (freeUsersNeedingRenewal.length === 0) {
      console.log("[CRON] ℹ️ No FREE users need renewal at this time");
      return {
        success: true,
        message: "No FREE users need renewal",
        processed: 0,
        skipped: false,
      };
    }

    const results = {
      processed: 0,
      errors: 0,
      users: [] as Array<{ userId: string; success: boolean; error?: string }>,
    };

    // Traiter chaque utilisateur FREE qui a besoin de renouvellement
    for (const user of freeUsersNeedingRenewal) {
      try {
        // Utiliser ensureMonthlyTopUp qui gère correctement le renouvellement mensuel
        // Il vérifie renewsAt, renouvelle à 50 crédits, et met à jour la date de renouvellement
        await ensureMonthlyTopUp(user.userId);
        
        results.processed++;
        results.users.push({ userId: user.userId, success: true });
        console.log(
          `[CRON] ✅ Processed user ${user.userId} - monthly renewal applied (50 credits)`
        );
      } catch (error) {
        results.errors++;
        const errorMsg =
          error instanceof Error ? error.message : "Unknown error";
        results.users.push({
          userId: user.userId,
          success: false,
          error: errorMsg,
        });
        console.error(
          `[CRON] ❌ Failed to process user ${user.userId}:`,
          errorMsg
        );
      }
    }

    console.log(`[CRON] 🎉 FREE credits monthly renewal completed:`);
    console.log(`  - Processed: ${results.processed} users`);
    console.log(`  - Errors: ${results.errors} users`);
    console.log(
      `  - Success rate: ${(
        (results.processed / freeUsersNeedingRenewal.length) *
        100
      ).toFixed(1)}%`
    );

    return {
      success: true,
      message: "FREE credits monthly renewal completed",
      processed: results.processed,
      errors: results.errors,
      users: results.users,
      skipped: false,
    };
  } catch (error) {
    console.error("[CRON] 💥 Fatal error in FREE credits renewal:", error);
    throw error;
  }
}

/**
 * Fonction pour vérifier l'état des crédits FREE
 */
export async function checkFreeCreditsStatus() {
  console.log("[CRON] 🔍 Checking FREE credits status...");

  try {
    const freeUsers = await prisma.subscriptions.findMany({
      where: {
        plan: Plan.FREE,
        status: SubscriptionStatus.ACTIVE,
      },
    });

    // Récupérer les soldes de crédits séparément
    const userIds = freeUsers.map((user) => user.userId);
    const creditBalances = await prisma.credit_balances.findMany({
      where: {
        userId: { in: userIds },
      },
    });

    // Combiner les données
    const usersWithBalances = freeUsers.map((user) => ({
      ...user,
      creditBalance:
        creditBalances.find((balance) => balance.userId === user.userId) ||
        null,
    }));

    const today = new Date();
    const todayStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

    const recentTopUps = await prisma.credit_ledger.count({
      where: {
        reason: CreditReason.MONTHLY_TOPUP,
        metadata: {
          path: ["source"],
          equals: "daily_cron",
        },
        createdAt: {
          gte: todayStart,
        },
      },
    });

    console.log(`[CRON] 📊 Status Report:`);
    console.log(`  - FREE users: ${usersWithBalances.length}`);
    console.log(`  - Top-ups today: ${recentTopUps}`);
    console.log(`  - Users with credits:`);

    usersWithBalances.forEach((user) => {
      const credits = user.creditBalance?.credits || 0;
      console.log(`    - ${user.userId}: ${credits} credits`);
    });

    return {
      freeUsers: usersWithBalances.length,
      topUpsToday: recentTopUps,
      users: usersWithBalances.map((user) => ({
        userId: user.userId,
        credits: user.creditBalance?.credits || 0,
      })),
    };
  } catch (error) {
    console.error("[CRON] ❌ Error checking FREE credits status:", error);
    throw error;
  }
}

/**
 * Fonction pour forcer le renouvellement (bypass idempotence)
 * Force le renouvellement mensuel pour tous les utilisateurs FREE
 */
export async function forceRefreshFreeCredits() {
  console.log(
    "[CRON] 🔄 Force refreshing FREE credits (forcing monthly renewal)..."
  );

  try {
    const freeUsers = await prisma.subscriptions.findMany({
      where: {
        plan: Plan.FREE,
        status: SubscriptionStatus.ACTIVE,
      },
      select: {
        userId: true,
      },
    });

    console.log(`[CRON] 📊 Force processing ${freeUsers.length} FREE users`);

    const results = {
      processed: 0,
      errors: 0,
    };

    for (const user of freeUsers) {
      try {
        // Utiliser ensureMonthlyTopUp qui gère correctement le renouvellement à 50 crédits
        await ensureMonthlyTopUp(user.userId);
        
        results.processed++;
        console.log(`[CRON] ✅ Force processed user ${user.userId} - monthly renewal applied (50 credits)`);
      } catch (error) {
        results.errors++;
        console.error(`[CRON] ❌ Force failed for user ${user.userId}:`, error);
      }
    }

    console.log(
      `[CRON] 🎉 Force refresh completed: ${results.processed} processed, ${results.errors} errors`
    );
    return results;
  } catch (error) {
    console.error("[CRON] 💥 Fatal error in force refresh:", error);
    throw error;
  }
}
