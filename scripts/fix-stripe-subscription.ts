import { config } from "dotenv";
import { resolve } from "path";

// Charger les variables d'environnement depuis .env.local
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

import { prisma } from "../src/lib/prisma";
import { grantCredits } from "../src/lib/credits";
import { Plan, SubscriptionStatus } from "@prisma/client";
import { randomUUID } from "crypto";
import Stripe from "stripe";

/**
 * Script pour corriger un abonnement Stripe et attribuer les crédits
 * Ce script trouve l'utilisateur via son customer Stripe ou subscription ID
 * 
 * Usage: 
 *   tsx scripts/fix-stripe-subscription.ts --customer-id <stripe_customer_id>
 *   tsx scripts/fix-stripe-subscription.ts --subscription-id <stripe_subscription_id>
 *   tsx scripts/fix-stripe-subscription.ts --email <user_email>
 */
async function fixStripeSubscription(options: {
  customerId?: string;
  subscriptionId?: string;
  email?: string;
}) {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2024-12-18.acacia",
    });

    let userId: string | null = null;
    let stripeCustomerId: string | null = null;
    let stripeSubscriptionId: string | null = null;

    // Option 1: Trouver par customer ID
    if (options.customerId) {
      console.log(`🔍 Recherche de l'abonnement avec customer ID: ${options.customerId}`);
      
      const subscription = await prisma.subscriptions.findFirst({
        where: { stripeCustomerId: options.customerId },
      });

      if (subscription) {
        userId = subscription.userId;
        stripeCustomerId = options.customerId;
        console.log(`✅ Abonnement trouvé pour user: ${userId}`);
      } else {
        console.log(`❌ Aucun abonnement trouvé pour ce customer ID`);
      }
    }
    // Option 2: Trouver par subscription ID
    else if (options.subscriptionId) {
      console.log(`🔍 Recherche de l'abonnement avec subscription ID: ${options.subscriptionId}`);
      
      const subscription = await prisma.subscriptions.findFirst({
        where: { stripeSubId: options.subscriptionId },
      });

      if (subscription) {
        userId = subscription.userId;
        stripeCustomerId = subscription.stripeCustomerId || null;
        stripeSubscriptionId = options.subscriptionId;
        console.log(`✅ Abonnement trouvé pour user: ${userId}`);
      } else {
        // Essayer de récupérer depuis Stripe
        try {
          const stripeSub = await stripe.subscriptions.retrieve(options.subscriptionId);
          const customerId = stripeSub.customer as string;
          
          const subscription = await prisma.subscriptions.findFirst({
            where: { stripeCustomerId: customerId },
          });

          if (subscription) {
            userId = subscription.userId;
            stripeCustomerId = customerId;
            stripeSubscriptionId = options.subscriptionId;
            console.log(`✅ Abonnement trouvé via Stripe API pour user: ${userId}`);
          } else {
            console.log(`❌ Aucun abonnement trouvé pour ce subscription ID dans la base de données`);
          }
        } catch (error) {
          console.error(`❌ Erreur lors de la récupération depuis Stripe:`, error);
        }
      }
    }
    // Option 3: Trouver par email (via Supabase)
    else if (options.email) {
      console.log(`🔍 Recherche de l'utilisateur par email: ${options.email}`);
      
      // Note: Cette option nécessiterait Supabase, mais on peut essayer de trouver
      // via les subscriptions existantes. Pour l'instant, on affiche un message.
      console.log(`⚠️  La recherche par email nécessite Supabase. Utilisez plutôt --customer-id ou --subscription-id`);
      process.exit(1);
    }

    if (!userId) {
      console.log(`\n❌ Impossible de trouver l'utilisateur.`);
      console.log(`\n💡 Pour obtenir votre customer ID ou subscription ID:`);
      console.log(`   1. Allez sur https://dashboard.stripe.com/test/subscriptions`);
      console.log(`   2. Trouvez votre subscription`);
      console.log(`   3. Copiez le Customer ID ou Subscription ID`);
      console.log(`   4. Utilisez: tsx scripts/fix-stripe-subscription.ts --customer-id <id>`);
      process.exit(1);
    }

    // Récupérer la subscription Stripe pour déterminer le plan
    let plan = Plan.PRO; // Par défaut
    if (stripeSubscriptionId) {
      try {
        const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
        const priceId = stripeSub.items.data[0]?.price.id;
        
        const basicPriceId = process.env.STRIPE_PRICE_ID_BASIC;
        const proPriceId = process.env.STRIPE_PRICE_ID_PRO;
        const businessPriceId = process.env.STRIPE_PRICE_ID_BUSINESS;

        if (priceId === basicPriceId || priceId === proPriceId) {
          plan = Plan.PRO;
        } else if (priceId === businessPriceId) {
          plan = Plan.BUSINESS;
        }
        console.log(`📦 Plan détecté depuis Stripe: ${plan}`);
      } catch (error) {
        console.log(`⚠️  Impossible de récupérer le plan depuis Stripe, utilisation de PRO par défaut`);
      }
    }

    // Récupérer l'abonnement actuel
    let subscription = await prisma.subscriptions.findUnique({
      where: { userId },
    });

    // Mettre à jour ou créer l'abonnement
    if (subscription) {
      subscription = await prisma.subscriptions.update({
        where: { userId },
        data: {
          plan,
          status: SubscriptionStatus.ACTIVE,
          stripeCustomerId: stripeCustomerId || subscription.stripeCustomerId,
          stripeSubId: stripeSubscriptionId || subscription.stripeSubId,
        },
      });
      console.log(`✅ Abonnement mis à jour: ${subscription.plan}`);
    } else {
      subscription = await prisma.subscriptions.create({
        data: {
          id: randomUUID(),
          userId,
          plan,
          status: SubscriptionStatus.ACTIVE,
          renewsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          stripeCustomerId: stripeCustomerId,
          stripeSubId: stripeSubscriptionId,
        },
      });
      console.log(`✅ Nouvel abonnement créé: ${subscription.plan}`);
    }

    // Attribuer les crédits initiaux si c'est un plan payant
    if (plan !== Plan.FREE) {
      const creditsByPlan = {
        [Plan.PRO]: 500,
        [Plan.BUSINESS]: 2500,
      };

      const creditsToGrant = creditsByPlan[plan];
      if (creditsToGrant) {
        // Vérifier le solde actuel
        const currentBalance = await prisma.credit_balances.findUnique({
          where: { userId },
        });

        const currentCredits = currentBalance?.credits || 0;
        
        // Si l'utilisateur a déjà des crédits, on ajoute seulement la différence
        // pour atteindre le montant initial du plan
        let creditsToAdd = creditsToGrant;
        if (currentCredits < creditsToGrant) {
          creditsToAdd = creditsToGrant - currentCredits;
        } else {
          console.log(`ℹ️  L'utilisateur a déjà ${currentCredits} crédits (>= ${creditsToGrant}), pas besoin d'ajouter`);
          creditsToAdd = 0;
        }

        if (creditsToAdd > 0) {
          await grantCredits(userId, creditsToAdd, "MONTHLY_TOPUP", {
            plan,
            reason: "manual_fix_after_stripe_payment",
            source: "fix_stripe_subscription_script",
            stripeCustomerId,
            stripeSubscriptionId,
          });
          console.log(`✅ ${creditsToAdd} crédits ajoutés (total: ${creditsToGrant})`);
        }
      }
    }

    // Afficher le résultat final
    const finalSubscription = await prisma.subscriptions.findUnique({
      where: { userId },
    });
    const creditBalance = await prisma.credit_balances.findUnique({
      where: { userId },
    });

    console.log("\n📊 Résultat final:");
    console.log(`   User ID: ${userId}`);
    console.log(`   Plan: ${finalSubscription?.plan}`);
    console.log(`   Status: ${finalSubscription?.status}`);
    console.log(`   Crédits: ${creditBalance?.credits || 0}`);
    console.log(`   Renouvellement: ${finalSubscription?.renewsAt}`);

    console.log("\n✅ Terminé avec succès!");
  } catch (error) {
    console.error("❌ Erreur:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Parser les arguments
async function main() {
  const args = process.argv.slice(2);
  
  const options: {
    customerId?: string;
    subscriptionId?: string;
    email?: string;
  } = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--customer-id" && args[i + 1]) {
      options.customerId = args[i + 1];
      i++;
    } else if (args[i] === "--subscription-id" && args[i + 1]) {
      options.subscriptionId = args[i + 1];
      i++;
    } else if (args[i] === "--email" && args[i + 1]) {
      options.email = args[i + 1];
      i++;
    }
  }

  if (!options.customerId && !options.subscriptionId && !options.email) {
    console.log("❌ Usage:");
    console.log("   tsx scripts/fix-stripe-subscription.ts --customer-id <id>");
    console.log("   tsx scripts/fix-stripe-subscription.ts --subscription-id <id>");
    console.log("\n💡 Pour obtenir votre IDs:");
    console.log("   1. Allez sur https://dashboard.stripe.com/test/subscriptions");
    console.log("   2. Trouvez votre subscription");
    console.log("   3. Copiez le Customer ID ou Subscription ID");
    process.exit(1);
  }

  await fixStripeSubscription(options);
}

main();

