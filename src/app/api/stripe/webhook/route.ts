import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { grantCredits } from "@/lib/credits";
import { Plan, SubscriptionStatus } from "@prisma/client";
import { randomUUID } from "crypto";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia" as any, // Version plus récente que les types Stripe
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature")!;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    switch (event.type) {
      case "customer.created": {
        const customer = event.data.object as Stripe.Customer;
        const customerId = customer.id;

        // Si le customer a un userId dans les metadata, on peut créer une subscription
        if (customer.metadata?.userId) {
          const userId = customer.metadata.userId;

          // Vérifier si une subscription existe déjà pour cet utilisateur
          let userSubscription = await prisma.subscriptions.findUnique({
            where: { userId },
          });

          if (!userSubscription) {
            // Créer une nouvelle subscription FREE par défaut
            await prisma.subscriptions.create({
              data: {
                id: randomUUID(),
                userId,
                plan: Plan.FREE,
                status: SubscriptionStatus.ACTIVE,
                renewsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 jours
                stripeCustomerId: customerId,
              },
            });
            console.log(`Created subscription for user ${userId} with customer ${customerId}`);
          } else if (!userSubscription.stripeCustomerId) {
            // Mettre à jour la subscription existante avec le customerId Stripe
            await prisma.subscriptions.update({
              where: { userId },
              data: { stripeCustomerId: customerId },
            });
            console.log(`Updated subscription for user ${userId} with customer ${customerId}`);
          }
        } else {
          console.log(`Customer ${customerId} created but no userId in metadata`);
        }

        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        let subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Si current_period_end est manquant, récupérer la subscription complète depuis Stripe
        if (!subscription.current_period_end && subscription.id) {
          try {
            console.log(`[Webhook] current_period_end missing, fetching full subscription ${subscription.id} from Stripe`);
            const fullSubscription = await stripe.subscriptions.retrieve(subscription.id, {
              expand: ['latest_invoice'],
            });
            subscription = fullSubscription;
            console.log(`[Webhook] Retrieved full subscription with current_period_end:`, fullSubscription.current_period_end);
          } catch (error) {
            console.error(`[Webhook] Failed to retrieve subscription ${subscription.id}:`, error);
          }
        }

        // Log pour debug
        console.log(`[Webhook] Processing subscription ${subscription.id}:`, {
          status: subscription.status,
          cancel_at_period_end: subscription.cancel_at_period_end,
          current_period_end: subscription.current_period_end,
          canceled_at: subscription.canceled_at,
        });

        // Find user by Stripe customer ID
        let userSubscription = await prisma.subscriptions.findFirst({
          where: { stripeCustomerId: customerId },
        });

        // Si pas trouvé par customerId, essayer de trouver par userId dans metadata
        if (!userSubscription && subscription.metadata?.userId) {
          userSubscription = await prisma.subscriptions.findUnique({
            where: { userId: subscription.metadata.userId },
          });
          
          // Mettre à jour avec le customerId si trouvé
          if (userSubscription) {
            await prisma.subscriptions.update({
              where: { userId: subscription.metadata.userId },
              data: { stripeCustomerId: customerId },
            });
          }
        }

        if (!userSubscription) {
          console.warn("No user found for customer:", customerId);
          break;
        }

        // Map Stripe Price ID to our plan
        // On vérifie si le Price ID correspond à un de nos Price IDs configurés
        const priceId = subscription.items.data[0]?.price.id;
        let plan: Plan = Plan.FREE;

        // Mapping basé sur les Price IDs configurés
        const basicPriceId = process.env.STRIPE_PRICE_ID_BASIC;
        const proPriceId = process.env.STRIPE_PRICE_ID_PRO;

        console.log(`[Webhook] Price ID mapping:`, {
          priceId,
          basicPriceId,
          proPriceId,
          subscriptionMetadata: subscription.metadata,
        });

        if (priceId === basicPriceId) {
          plan = Plan.BASIC; // BASIC plan (350 crédits)
          console.log(`[Webhook] Mapped to BASIC plan (priceId: ${priceId})`);
        } else if (priceId === proPriceId) {
          plan = Plan.PRO; // PRO plan (750 crédits)
          console.log(`[Webhook] Mapped to PRO plan (priceId: ${priceId})`);
        } else if (subscription.metadata?.plan) {
          // Fallback: utiliser le plan dans metadata si disponible
          const metadataPlan = subscription.metadata.plan.toUpperCase().trim();
          if (metadataPlan === "BASIC") {
            plan = Plan.BASIC; // BASIC plan (350 crédits)
            console.log(`[Webhook] Mapped to BASIC plan from metadata`);
          } else if (metadataPlan === "PRO") {
            plan = Plan.PRO; // PRO plan (750 crédits)
            console.log(`[Webhook] Mapped to PRO plan from metadata`);
          } else {
            console.warn(`[Webhook] Invalid metadata plan: "${subscription.metadata.plan}" (normalized: "${metadataPlan}"), defaulting to FREE`);
            plan = Plan.FREE;
          }
        } else {
          console.warn(`[Webhook] Could not determine plan for priceId: ${priceId}, defaulting to FREE`);
          plan = Plan.FREE;
        }

        // Vérifier que plan est bien défini après le mapping
        console.log(`[Webhook] Plan after mapping:`, {
          plan,
          planString: String(plan),
          planType: typeof plan,
        });

        if (plan === undefined || plan === null) {
          console.error(`[Webhook] Plan is undefined after mapping! Defaulting to FREE`);
          plan = Plan.FREE;
        }
        // Vérifier si l'abonnement est programmé pour être annulé à la fin de la période
        const cancelAtPeriodEnd = subscription.cancel_at_period_end || false;
        
        const status =
          subscription.status === "active"
            ? SubscriptionStatus.ACTIVE
            : subscription.status === "past_due"
            ? SubscriptionStatus.PAST_DUE
            : SubscriptionStatus.CANCELED;

        // Si l'abonnement est annulé ou a expiré, retourner au plan FREE
        console.log(`[Webhook] Initial plan determination:`, {
          plan,
          planType: typeof plan,
          planValue: plan,
        });
        let finalPlan: Plan = plan;
        let finalRenewsAt: Date;
        let finalStatus = status;

        // Déterminer la date de fin de période
        let periodEndDate: Date | null = null;
        if (subscription.current_period_end && typeof subscription.current_period_end === 'number') {
          periodEndDate = new Date(subscription.current_period_end * 1000);
        }
        const now = new Date();
        const isPeriodEnded = periodEndDate ? now >= periodEndDate : false;

        // Si l'abonnement est programmé pour être annulé à la fin de la période
        if (cancelAtPeriodEnd && subscription.status === "active") {
          // L'abonnement est programmé pour être annulé à la fin de la période
          if (isPeriodEnded) {
            // La période est terminée : retourner au plan FREE
            finalPlan = Plan.FREE;
            finalStatus = SubscriptionStatus.CANCELED;
            finalRenewsAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // Dans 24h pour renouvellement quotidien
            console.log(
              `[Webhook] Subscription period ended for user ${userSubscription.userId}, reverting to FREE plan`
            );
          } else {
            // La période n'est pas encore terminée : garder le plan PRO mais marquer comme CANCELED pour l'affichage
            finalPlan = plan; // Garder le plan actuel (PRO)
            finalStatus = SubscriptionStatus.CANCELED; // Statut CANCELED pour indiquer l'annulation programmée
            finalRenewsAt = periodEndDate!; // Date de fin de période
            console.log(
              `[Webhook] Subscription scheduled to cancel at period end for user ${userSubscription.userId} (ends on ${finalRenewsAt.toISOString()}), keeping plan ${plan} until then`
            );
          }
        } 
        // Si l'abonnement est complètement annulé ou a expiré (pas juste programmé)
        else if (
          status === SubscriptionStatus.CANCELED ||
          subscription.status === "canceled" ||
          subscription.status === "incomplete_expired" ||
          subscription.status === "unpaid"
        ) {
          // Retourner au plan FREE avec renouvellement mensuel (50 crédits/mois)
          finalPlan = Plan.FREE;
          const nextMonth = new Date();
          nextMonth.setMonth(nextMonth.getMonth() + 1); // Dans 1 mois pour renouvellement mensuel
          finalRenewsAt = nextMonth;
          console.log(
            `[Webhook] Subscription canceled for user ${userSubscription.userId}, reverting to FREE plan`
          );
        } 
        // Plan payant actif (non annulé)
        else {
          finalPlan = plan;
          // Plan payant actif - utiliser la date de fin de période Stripe
          if (periodEndDate) {
            finalRenewsAt = periodEndDate;
          } else {
            // Fallback: utiliser la date actuelle + 30 jours si current_period_end n'est pas disponible
            finalRenewsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            console.warn(
              `[Webhook] Subscription.current_period_end is missing for user ${userSubscription.userId}, using fallback date`
            );
          }
        }

        console.log(`[Webhook] Determining final plan:`, {
          plan,
          finalPlan,
          status,
          finalStatus,
          cancelAtPeriodEnd,
          subscriptionStatus: subscription.status,
        });

        // Vérifier que finalPlan est bien défini
        if (!finalPlan || finalPlan === undefined) {
          console.error(`[Webhook] finalPlan is undefined! Using plan instead: ${plan}`);
          finalPlan = plan || Plan.FREE;
        }

        // Vérifier que finalRenewsAt est bien défini
        if (!finalRenewsAt) {
          console.error(`[Webhook] finalRenewsAt is undefined! Using fallback date`);
          finalRenewsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        }

        console.log(`[Webhook] Updating subscription for user ${userSubscription.userId}:`, {
          plan: finalPlan,
          planString: String(finalPlan),
          status: finalStatus,
          renewsAt: finalRenewsAt.toISOString(),
          stripeSubId: subscription.id,
        });

        const updatedSubscription = await prisma.subscriptions.upsert({
          where: { userId: userSubscription.userId },
          update: {
            plan: finalPlan,
            status: finalStatus,
            renewsAt: finalRenewsAt,
            stripeSubId: subscription.id,
            stripeCustomerId: customerId, // S'assurer que le customerId est à jour
          },
          create: {
            id: randomUUID(),
            userId: userSubscription.userId,
            plan: finalPlan,
            status: finalStatus,
            renewsAt: finalRenewsAt,
            stripeCustomerId: customerId,
            stripeSubId: subscription.id,
          },
        });

        console.log(`[Webhook] Subscription updated successfully:`, {
          userId: updatedSubscription.userId,
          plan: updatedSubscription.plan,
          status: updatedSubscription.status,
        });

        // Attribuer les crédits initiaux lors de la création d'un nouvel abonnement payant
        // Respecter le maximum : si l'utilisateur a déjà des crédits, ne pas dépasser le max
        if (event.type === "customer.subscription.created" && plan !== Plan.FREE) {
          const maxCreditsByPlan = {
            [Plan.PRO]: 750, // 750 crédits maximum par mois (PRO)
            [Plan.BASIC]: 350, // 350 crédits maximum par mois (BASIC)
          };

          const maxCredits = maxCreditsByPlan[plan];
          if (maxCredits) {
            // Récupérer le solde actuel
            const currentBalance = await prisma.credit_balances.findUnique({
              where: { userId: userSubscription.userId },
              select: { credits: true },
            });

            const currentCredits = currentBalance?.credits ?? 0;

            // Calculer combien de crédits ajouter (seulement jusqu'au maximum)
            const creditsToAdd = Math.max(0, maxCredits - currentCredits);

            if (creditsToAdd > 0) {
              await grantCredits(
                userSubscription.userId,
                creditsToAdd,
                "MONTHLY_TOPUP",
                {
                  stripeSubscriptionId: subscription.id,
                  stripeCustomerId: customerId,
                  plan,
                  reason: "initial_subscription_credits",
                  currentCredits,
                  maxCredits,
                  creditsAdded: creditsToAdd,
                }
              );
              console.log(
                `Granted ${creditsToAdd} initial credits to user ${userSubscription.userId} for ${plan} plan (had ${currentCredits}, now has ${currentCredits + creditsToAdd}/${maxCredits})`
              );
            } else {
              console.log(
                `User ${userSubscription.userId} already has ${currentCredits}/${maxCredits} credits (${plan}), no initial credits needed`
              );
            }
          }
        }

        break;
      }

      case "customer.subscription.deleted": {
        // Abonnement complètement supprimé - retourner au plan FREE
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Find user by Stripe customer ID
        let userSubscription = await prisma.subscriptions.findFirst({
          where: { stripeCustomerId: customerId },
        });

        // Si pas trouvé par customerId, essayer de trouver par userId dans metadata
        if (!userSubscription && subscription.metadata?.userId) {
          userSubscription = await prisma.subscriptions.findUnique({
            where: { userId: subscription.metadata.userId },
          });
        }

        if (userSubscription) {
          // Retourner au plan FREE avec renouvellement mensuel (50 crédits/mois)
          const nextMonth = new Date();
          nextMonth.setMonth(nextMonth.getMonth() + 1); // Dans 1 mois pour renouvellement mensuel
          await prisma.subscriptions.update({
            where: { userId: userSubscription.userId },
            data: {
              plan: Plan.FREE,
              status: SubscriptionStatus.CANCELED,
              renewsAt: nextMonth,
              stripeSubId: null, // Plus d'abonnement Stripe actif
            },
          });
          console.log(
            `Subscription deleted for user ${userSubscription.userId}, reverted to FREE plan`
          );
        } else {
          console.warn("No user found for deleted subscription customer:", customerId);
        }

        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        // Find user by Stripe customer ID
        let userSubscription = await prisma.subscriptions.findFirst({
          where: { stripeCustomerId: customerId },
        });

        // Si pas trouvé par customerId, essayer de trouver par userId dans metadata
        if (!userSubscription && invoice.metadata?.userId) {
          userSubscription = await prisma.subscriptions.findUnique({
            where: { userId: invoice.metadata.userId },
          });
        }

        if (!userSubscription) {
          console.warn("No user found for customer:", customerId);
          break;
        }

        // Check if this is a credit pack purchase
        const lineItems = await stripe.invoiceItems.list({
          invoice: invoice.id,
        });

        for (const item of lineItems.data) {
          if (item.price?.metadata?.type === "credit_pack") {
            const credits = parseInt(item.price.metadata.credits || "0");
            if (credits > 0) {
              await grantCredits(userSubscription.userId, credits, "PURCHASE", {
                stripeInvoiceId: invoice.id,
                creditPack: item.price.id,
              });
            }
          }
        }

        break;
      }

      default:
        // Ignorer silencieusement les événements Stripe non critiques (invoice.paid, charge.succeeded, etc.)
        // Ces événements sont normaux et n'ont pas besoin d'être traités
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
