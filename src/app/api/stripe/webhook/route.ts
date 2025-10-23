import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { grantCredits } from "@/lib/credits";
import { Plan, SubscriptionStatus } from "@prisma/client";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
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
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Find user by Stripe customer ID
        const user = await prisma.subscription.findFirst({
          where: { stripeCustomerId: customerId },
        });

        if (!user) {
          console.warn("No user found for customer:", customerId);
          break;
        }

        // Map Stripe plan to our plan
        const planMapping: Record<string, Plan> = {
          price_free: Plan.FREE,
          price_pro: Plan.PRO,
          price_business: Plan.BUSINESS,
        };

        const plan =
          planMapping[subscription.items.data[0]?.price.id] || Plan.FREE;
        const status =
          subscription.status === "active"
            ? SubscriptionStatus.ACTIVE
            : subscription.status === "past_due"
            ? SubscriptionStatus.PAST_DUE
            : SubscriptionStatus.CANCELED;

        const renewsAt = new Date(subscription.current_period_end * 1000);

        await prisma.subscription.upsert({
          where: { userId: user.userId },
          update: {
            plan,
            status,
            renewsAt,
            stripeSubId: subscription.id,
          },
          create: {
            userId: user.userId,
            plan,
            status,
            renewsAt,
            stripeCustomerId: customerId,
            stripeSubId: subscription.id,
          },
        });

        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        // Find user by Stripe customer ID
        const user = await prisma.subscription.findFirst({
          where: { stripeCustomerId: customerId },
        });

        if (!user) {
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
              await grantCredits(user.userId, credits, "PURCHASE", {
                stripeInvoiceId: invoice.id,
                creditPack: item.price.id,
              });
            }
          }
        }

        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
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
