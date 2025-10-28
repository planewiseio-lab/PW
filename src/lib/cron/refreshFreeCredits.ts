import { prisma } from "@/lib/prisma";
import { Plan, CreditReason } from "@prisma/client";

/**
 * Cron job pour renouveler les crédits des utilisateurs FREE chaque jour
 * S'exécute à 00:00 heure de l'Est (America/Toronto)
 */
export async function refreshFreeCreditsDaily() {
  console.log("[CRON] 🕐 Starting daily FREE credits refresh...");

  try {
    // Vérifier l'idempotence - éviter les doublons le même jour
    const today = new Date();
    const todayStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    // Vérifier si on a déjà traité les crédits FREE aujourd'hui
    // On vérifie s'il y a eu un top-up pour n'importe quel utilisateur FREE aujourd'hui
    const existingTopUp = await prisma.credit_ledger.findFirst({
      where: {
        reason: CreditReason.DAILY_TOPUP,
        metadata: {
          path: ["source"],
          equals: "daily_cron",
        },
        createdAt: {
          gte: todayStart,
          lt: todayEnd,
        },
      },
    });

    if (existingTopUp) {
      console.log(
        "[CRON] ⚠️ FREE credits already processed today, skipping..."
      );
      return {
        success: true,
        message: "FREE credits already processed today",
        processed: 0,
        skipped: true,
      };
    }

    // Récupérer tous les utilisateurs avec le plan FREE
    const freeUsers = await prisma.subscription.findMany({
      where: {
        plan: Plan.FREE,
        status: "ACTIVE",
      },
      select: {
        userId: true,
      },
    });

    console.log(`[CRON] 📊 Found ${freeUsers.length} FREE users to process`);

    if (freeUsers.length === 0) {
      console.log("[CRON] ℹ️ No FREE users found, nothing to process");
      return {
        success: true,
        message: "No FREE users found",
        processed: 0,
        skipped: false,
      };
    }

    const results = {
      processed: 0,
      errors: 0,
      users: [] as Array<{ userId: string; success: boolean; error?: string }>,
    };

    // Traiter chaque utilisateur FREE
    for (const user of freeUsers) {
      try {
        await prisma.$transaction(async (tx) => {
          // Vérifier le solde actuel
          const currentBalance = await tx.credit_balances.findUnique({
            where: { userId: user.userId },
            select: { credits: true },
          });

          const currentCredits = currentBalance?.credits ?? 0;
          const maxCredits = 5; // Limite pour le plan FREE

          // Calculer combien de crédits ajouter (sans dépasser la limite)
          const creditsToAdd = Math.max(0, maxCredits - currentCredits);

          if (creditsToAdd === 0) {
            console.log(
              `[CRON] ⏭️ User ${user.userId} already has ${currentCredits} credits (max: ${maxCredits}), skipping`
            );
            return; // Pas besoin d'ajouter de crédits
          }

          // Créer l'entrée dans le ledger seulement si on ajoute des crédits
          await tx.credit_ledger.create({
            data: {
              id: crypto.randomUUID(),
              userId: user.userId,
              delta: creditsToAdd,
              reason: CreditReason.DAILY_TOPUP,
              metadata: {
                source: "daily_cron",
                plan: "FREE",
                previousBalance: currentCredits,
                newBalance: currentCredits + creditsToAdd,
                processedAt: new Date().toISOString(),
              },
            },
          });

          // Mettre à jour le solde (ajouter seulement les crédits nécessaires)
          await tx.credit_balances.upsert({
            where: { userId: user.userId },
            update: {
              credits: { increment: creditsToAdd },
              updatedAt: new Date(),
            },
            create: {
              userId: user.userId,
              credits: creditsToAdd,
            },
          });
        });

        results.processed++;
        results.users.push({ userId: user.userId, success: true });
        console.log(
          `[CRON] ✅ Processed user ${user.userId} - credits updated`
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

    console.log(`[CRON] 🎉 Daily FREE credits refresh completed:`);
    console.log(`  - Processed: ${results.processed} users`);
    console.log(`  - Errors: ${results.errors} users`);
    console.log(
      `  - Success rate: ${(
        (results.processed / freeUsers.length) *
        100
      ).toFixed(1)}%`
    );

    return {
      success: true,
      message: "FREE credits refresh completed",
      processed: results.processed,
      errors: results.errors,
      users: results.users,
      skipped: false,
    };
  } catch (error) {
    console.error("[CRON] 💥 Fatal error in FREE credits refresh:", error);
    throw error;
  }
}

/**
 * Fonction pour vérifier l'état des crédits FREE
 */
export async function checkFreeCreditsStatus() {
  console.log("[CRON] 🔍 Checking FREE credits status...");

  try {
    const freeUsers = await prisma.subscription.findMany({
      where: {
        plan: Plan.FREE,
        status: "ACTIVE",
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
 */
export async function forceRefreshFreeCredits() {
  console.log(
    "[CRON] 🔄 Force refreshing FREE credits (bypassing idempotence)..."
  );

  try {
    const freeUsers = await prisma.subscription.findMany({
      where: {
        plan: Plan.FREE,
        status: "ACTIVE",
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
        await prisma.$transaction(async (tx) => {
          await tx.credit_ledger.create({
            data: {
              id: crypto.randomUUID(),
              userId: user.userId,
              delta: 5,
              reason: CreditReason.MONTHLY_TOPUP,
              metadata: {
                source: "daily_cron_forced",
                plan: "FREE",
                processedAt: new Date().toISOString(),
                forced: true,
              },
            },
          });

          await tx.credit_balances.upsert({
            where: { userId: user.userId },
            update: {
              credits: 5,
              updatedAt: new Date(),
            },
            create: {
              userId: user.userId,
              credits: 5,
            },
          });
        });

        results.processed++;
        console.log(`[CRON] ✅ Force processed user ${user.userId}`);
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
