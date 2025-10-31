import { prisma } from "../src/lib/prisma";
import { grantCredits } from "../src/lib/credits";
import { Plan, SubscriptionStatus } from "@prisma/client";
import { randomUUID } from "crypto";

/**
 * Script pour mettre à jour un abonnement et attribuer les crédits initiaux
 * Usage: tsx scripts/fix-subscription-credits.ts <userId> <plan>
 * Exemple: tsx scripts/fix-subscription-credits.ts <user-id> PRO
 */
async function fixSubscriptionCredits(userId: string, planName: string) {
  try {
    // Valider le plan
    const validPlans = ["FREE", "PRO", "BUSINESS"];
    if (!validPlans.includes(planName.toUpperCase())) {
      console.error(`Invalid plan: ${planName}. Valid plans: ${validPlans.join(", ")}`);
      process.exit(1);
    }

    const plan = planName.toUpperCase() as Plan;

    // Vérifier si l'utilisateur existe
    const subscription = await prisma.subscriptions.findUnique({
      where: { userId },
    });

    if (!subscription) {
      console.error(`No subscription found for user: ${userId}`);
      console.log("Creating new subscription...");
      
      // Créer une nouvelle subscription
      await prisma.subscriptions.create({
        data: {
          id: randomUUID(),
          userId,
          plan,
          status: SubscriptionStatus.ACTIVE,
          renewsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 jours
        },
      });
      console.log(`✅ Created subscription for user ${userId}`);
    } else {
      // Mettre à jour l'abonnement existant
      await prisma.subscriptions.update({
        where: { userId },
        data: {
          plan,
          status: SubscriptionStatus.ACTIVE,
        },
      });
      console.log(`✅ Updated subscription to ${plan} for user ${userId}`);
    }

    // Attribuer les crédits initiaux si c'est un plan payant
    if (plan !== Plan.FREE) {
      const creditsByPlan = {
        [Plan.PRO]: 500,
        [Plan.BUSINESS]: 2500,
      };

      const creditsToGrant = creditsByPlan[plan];
      if (creditsToGrant) {
        await grantCredits(userId, creditsToGrant, "MONTHLY_TOPUP", {
          plan,
          reason: "manual_fix",
          source: "fix_subscription_credits_script",
        });
        console.log(`✅ Granted ${creditsToGrant} credits to user ${userId}`);
      }
    }

    // Afficher le résultat
    const updatedSubscription = await prisma.subscriptions.findUnique({
      where: { userId },
    });
    const creditBalance = await prisma.credit_balances.findUnique({
      where: { userId },
    });

    console.log("\n📊 Current Status:");
    console.log(`   Plan: ${updatedSubscription?.plan}`);
    console.log(`   Status: ${updatedSubscription?.status}`);
    console.log(`   Credits: ${creditBalance?.credits || 0}`);
    console.log(`   Renews At: ${updatedSubscription?.renewsAt}`);

    console.log("\n✅ Done!");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Script principal
async function main() {
  const userId = process.argv[2];
  const planName = process.argv[3] || "PRO";

  if (!userId) {
    console.error("Usage: tsx scripts/fix-subscription-credits.ts <userId> [plan]");
    console.error("Example: tsx scripts/fix-subscription-credits.ts <user-id> PRO");
    process.exit(1);
  }

  await fixSubscriptionCredits(userId, planName);
}

main();

