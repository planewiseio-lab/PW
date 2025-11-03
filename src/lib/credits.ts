import { prisma } from "@/lib/prisma";
import { ActionType, CreditReason, Plan, SubscriptionStatus } from "@prisma/client";
import Stripe from "stripe";

export class InsufficientCreditsError extends Error {
  constructor(message = "Insufficient credits") {
    super(message);
    this.name = "InsufficientCreditsError";
  }
}

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class AdminOnlyError extends Error {
  constructor(message = "Admin access required") {
    super(message);
    this.name = "AdminOnlyError";
  }
}

/**
 * Get credit cost based on action type (tier-based pricing)
 * tier 1 = AIRCRAFT_LOOKUP (-1 credit)
 * tier 3 = VIEW_FLIGHT_HISTORY (-4 credits)
 * tier 2 = everything else (-2 credits)
 */
export function getCreditCost(actionType: ActionType): number {
  switch (actionType) {
    case ActionType.AIRCRAFT_LOOKUP:
      return 1; // tier 1
    case ActionType.VIEW_FLIGHT_HISTORY:
      return 4; // tier 3
    default:
      return 2; // tier 2 (BROWSE_FLIGHT, BROWSE_AIRPORT, UNKNOWN)
  }
}

export interface UsageHistoryItem {
  id: string;
  delta: number;
  reason: CreditReason;
  actionType: ActionType | null;
  refId: string | null;
  metadata: any;
  createdAt: Date;
}

export interface UsageHistoryResponse {
  items: UsageHistoryItem[];
  nextCursor: string | null;
}

/**
 * Get current credit balance for a user
 */
export async function getCreditBalance(userId: string): Promise<number> {
  const balance = await prisma.credit_balances.findUnique({
    where: { userId },
    select: { credits: true },
  });

  return balance?.credits ?? 0;
}

/**
 * Get usage history for a user with pagination
 */
export async function getUsageHistory(
  userId: string,
  limit = 100,
  cursor?: string
): Promise<UsageHistoryResponse> {
  const items = await prisma.credit_ledger.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor && {
      cursor: { id: cursor },
      skip: 1,
    }),
  });

  const hasNextPage = items.length > limit;
  const nextCursor = hasNextPage ? items[limit - 1].id : null;
  const result = hasNextPage ? items.slice(0, limit) : items;

  return {
    items: result.map((item) => ({
      id: item.id,
      delta: item.delta,
      reason: item.reason,
      actionType: item.actionType,
      refId: item.refId,
      metadata: item.metadata,
      createdAt: item.createdAt,
    })),
    nextCursor,
  };
}

/**
 * Grant or remove credits to/from a user
 * @param amount - Positive number to add credits, negative number to remove credits
 */
export async function grantCredits(
  userId: string,
  amount: number,
  reason: "MONTHLY_TOPUP" | "MANUAL_ADJUST" | "PURCHASE",
  metadata?: any
): Promise<void> {
  if (amount === 0) {
    throw new Error("Amount must not be zero");
  }

  await prisma.$transaction(async (tx) => {
    // Get current balance to check if removal would result in negative balance
    const currentBalance = await tx.credit_balances.findUnique({
      where: { userId },
      select: { credits: true },
    });

    const currentCredits = currentBalance?.credits ?? 0;
    const newCredits = currentCredits + amount;

    // Prevent negative balance
    if (newCredits < 0) {
      throw new Error(
        `Cannot remove ${Math.abs(amount)} credits. Current balance: ${currentCredits}`
      );
    }

    // Create ledger entry
    await tx.credit_ledger.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        delta: amount, // Can be negative for removal
        reason: reason as CreditReason,
        metadata,
      },
    });

    // Update balance
    await tx.credit_balances.upsert({
      where: { userId },
      update: { credits: { increment: amount } },
      create: { userId, credits: Math.max(0, amount) }, // For new users, ensure non-negative
    });
  });
}

/**
 * Charge one credit for an action (atomic operation)
 */
export async function chargeOneCredit(opts: {
  userId: string;
  actionType: ActionType;
  idempotencyKey?: string;
  refId?: string;
  metadata?: any;
}): Promise<{ newBalance: number }> {
  const { userId, actionType, idempotencyKey, refId, metadata } = opts;

  // Generate idempotency key if not provided
  const key =
    idempotencyKey || `${userId}-${actionType}-${Date.now()}-${Math.random()}`;

  return await prisma.$transaction(async (tx) => {
    // Check if this action was already processed (idempotency)
    const existingEvent = await tx.usage_events.findUnique({
      where: { idempotencyKey: key },
    });

    if (existingEvent) {
      console.log(
        `[Credits] ⏭️ Action already processed (idempotency): ${key}. Skipping credit charge.`
      );
      // Return current balance without charging again
      const balance = await tx.credit_balances.findUnique({
        where: { userId },
        select: { credits: true },
      });
      const currentBalance = balance?.credits ?? 0;
      console.log(
        `[Credits] 📊 Returning existing balance: ${currentBalance} credits`
      );
      return { newBalance: currentBalance };
    }

    console.log(
      `[Credits] 💳 Processing new credit charge for user ${userId} with key: ${key}`
    );

    // Get current balance with row lock
    const balance = await tx.credit_balances.findUnique({
      where: { userId },
      select: { credits: true },
    });

    const currentCredits = balance?.credits ?? 0;

    // Get credit cost based on action type (tier-based)
    const cost = getCreditCost(actionType);

    // Check if user has sufficient credits
    if (currentCredits < cost) {
      throw new InsufficientCreditsError();
    }

    // Create usage event
    const usageEventId = crypto.randomUUID();
    await tx.usage_events.create({
      data: {
        id: usageEventId,
        userId,
        actionType,
        idempotencyKey: key,
        cost,
      },
    });
    console.log(
      `[Credits] ✅ Created usage event: ${usageEventId} for action ${actionType} (cost: ${cost} credits)`
    );

    // Create ledger entry
    const ledgerId = crypto.randomUUID();
    await tx.credit_ledger.create({
      data: {
        id: ledgerId,
        userId,
        delta: -cost,
        reason: CreditReason.ACTION,
        actionType,
        refId,
        metadata,
      },
    });
    console.log(
      `[Credits] 📝 Created ledger entry: ${ledgerId} (delta: -${cost})`
    );

    // Update balance
    const newBalance = currentCredits - cost;
    await tx.credit_balances.upsert({
      where: { userId },
      update: { credits: { decrement: cost } },
      create: { userId, credits: newBalance },
    });
    console.log(
      `[Credits] 💰 Updated balance: ${currentCredits} -> ${newBalance} credits`
    );

    return { newBalance };
  });
}

/**
 * Charge multiple credits for multiple actions (atomic operation)
 * Used for aircraft lookup + images (2 credits total)
 */
export async function chargeMultipleCredits(opts: {
  userId: string;
  actions: Array<{
    actionType: ActionType;
    idempotencyKey?: string;
    refId?: string;
    metadata?: any;
  }>;
  baseIdempotencyKey?: string;
}): Promise<{ newBalance: number; chargedActions: ActionType[] }> {
  const { userId, actions, baseIdempotencyKey } = opts;
  
  // Calculate total cost based on tier-based pricing for each action
  const totalCost = actions.reduce((sum, action) => {
    if (!action.actionType) {
      throw new Error(`Action type is required for action in multi-action charge`);
    }
    return sum + getCreditCost(action.actionType);
  }, 0);

  // Generate base idempotency key if not provided
  const baseKey =
    baseIdempotencyKey || `${userId}-multi-${Date.now()}-${Math.random()}`;

  return await prisma.$transaction(async (tx) => {
    // Check if this multi-action was already processed (idempotency)
    const existingEvent = await tx.usage_events.findUnique({
      where: { idempotencyKey: baseKey },
    });

    if (existingEvent) {
      // Return current balance without charging again
      const balance = await tx.credit_balances.findUnique({
        where: { userId },
        select: { credits: true },
      });
      return {
        newBalance: balance?.credits ?? 0,
        chargedActions: actions.map((a) => a.actionType),
      };
    }

    // Get current balance with row lock
    const balance = await tx.credit_balances.findUnique({
      where: { userId },
      select: { credits: true },
    });

    const currentCredits = balance?.credits ?? 0;

    // Check if user has sufficient credits
    if (currentCredits < totalCost) {
      throw new InsufficientCreditsError();
    }

    // Create usage events for each action
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      const actionKey = action.idempotencyKey || `${baseKey}-${i}`;

      // Ensure actionType is defined
      if (!action.actionType) {
        throw new Error(`Action type is required for action at index ${i}`);
      }

      // Get credit cost for this action
      const actionCost = getCreditCost(action.actionType);

      await tx.usage_events.create({
        data: {
          id: crypto.randomUUID(),
          userId,
          actionType: action.actionType,
          idempotencyKey: actionKey,
          cost: actionCost,
        },
      });

      // Create ledger entry for each action
      await tx.credit_ledger.create({
        data: {
          id: crypto.randomUUID(),
          userId,
          delta: -actionCost,
          reason: CreditReason.ACTION,
          actionType: action.actionType,
          refId: action.refId,
          metadata: {
            ...action.metadata,
            multiAction: true,
            baseIdempotencyKey: baseKey,
            actionIndex: i,
          },
        },
      });
    }

    // Update balance
    const newBalance = currentCredits - totalCost;
    await tx.credit_balances.upsert({
      where: { userId },
      update: { credits: { decrement: totalCost } },
      create: { userId, credits: newBalance },
    });

    return {
      newBalance,
      chargedActions: actions.map((a) => a.actionType),
    };
  });
}

/**
 * Ensure top-up is applied based on subscription plan and timing
 * For paid plans, checks Stripe subscription status and downgrades to FREE if expired
 */
export async function ensureMonthlyTopUp(userId: string): Promise<void> {
  const subscription = await prisma.subscriptions.findUnique({
    where: { userId },
  });

  if (!subscription) {
    return; // No subscription, no top-up
  }

  const now = new Date();

  // Check if it's time for renewal based on plan
  const shouldRenew = subscription.renewsAt <= now;

  if (!shouldRenew) {
    return; // Not time for renewal yet
  }

  let finalPlan = subscription.plan;
  let finalStatus = subscription.status;

  // For paid plans (PRO/BASIC), verify Stripe subscription status
  if (subscription.plan !== Plan.FREE && subscription.stripeSubId) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: "2024-12-18.acacia",
      });

      const stripeSubscription = await stripe.subscriptions.retrieve(
        subscription.stripeSubId
      );

      // Check if subscription is expired/canceled/unpaid/past_due
      if (
        stripeSubscription.status === "canceled" ||
        stripeSubscription.status === "unpaid" ||
        stripeSubscription.status === "incomplete_expired" ||
        stripeSubscription.status === "past_due"
      ) {
        // Subscription expired/canceled - downgrade to FREE
        console.log(
          `[Top-up] Stripe subscription ${subscription.stripeSubId} is ${stripeSubscription.status}, downgrading user ${userId} to FREE plan`
        );
        finalPlan = Plan.FREE;
        finalStatus = SubscriptionStatus.CANCELED;
      } else if (stripeSubscription.status === "active") {
        // Subscription is active, keep the plan
        finalPlan = subscription.plan;
        finalStatus = SubscriptionStatus.ACTIVE;
      }
    } catch (error: any) {
      // If subscription not found in Stripe, consider it expired
      if (error?.code === "resource_missing") {
        console.log(
          `[Top-up] Stripe subscription ${subscription.stripeSubId} not found, downgrading user ${userId} to FREE plan`
        );
        finalPlan = Plan.FREE;
        finalStatus = SubscriptionStatus.CANCELED;
      } else {
        console.error(
          `[Top-up] Error checking Stripe subscription for user ${userId}:`,
          error
        );
        // On error, keep current plan but log warning
      }
    }
  }

  // Calculate maximum credits by plan
  const maxCreditsByPlan = {
    [Plan.FREE]: 50, // 50 crédits par mois
    [Plan.PRO]: 750, // 750 crédits maximum par mois (PRO)
    [Plan.BASIC]: 350, // 350 crédits maximum par mois (BASIC)
  };

  const maxCredits = maxCreditsByPlan[finalPlan];

  // Get current credit balance
  const currentBalance = await prisma.credit_balances.findUnique({
    where: { userId },
    select: { credits: true },
  });

  const currentCredits = currentBalance?.credits ?? 0;

  // If downgrading to FREE and user has more than 50 credits, reduce to 50
  if (finalPlan === Plan.FREE && currentCredits > 50) {
    const creditsToRemove = currentCredits - 50;
    console.log(
      `[Top-up] User ${userId} downgraded to FREE, removing ${creditsToRemove} credits (from ${currentCredits} to 50)`
    );

    // Use a transaction to update balance and create ledger entry
    await prisma.$transaction(async (tx) => {
      // Update balance to 50
      await tx.credit_balances.upsert({
        where: { userId },
        update: { credits: 50 },
        create: { userId, credits: 50 },
      });

      // Create ledger entry for the reduction
      await tx.credit_ledger.create({
        data: {
          id: crypto.randomUUID(),
          userId,
          delta: -creditsToRemove,
          reason: CreditReason.ADMIN_FIX,
          actionType: null,
          refId: null,
          metadata: {
            reason: "downgrade_to_free",
            previousPlan: subscription.plan,
            previousCredits: currentCredits,
            newCredits: 50,
          },
        },
      });
    });
  }

  // Get updated balance after potential reduction
  const updatedBalance = await prisma.credit_balances.findUnique({
    where: { userId },
    select: { credits: true },
  });

  const updatedCredits = updatedBalance?.credits ?? 0;

  // Calculate how many credits to add (only up to the maximum)
  const creditsToAdd = Math.max(0, maxCredits - updatedCredits);

  if (creditsToAdd === 0) {
    // User already has maximum credits, just update renewal date and plan
    console.log(
      `[Top-up] User ${userId} already has ${updatedCredits}/${maxCredits} credits (${finalPlan}), no top-up needed`
    );
  } else {
    // Grant only the difference to reach the maximum
    console.log(
      `[Top-up] User ${userId} has ${updatedCredits}/${maxCredits} credits (${finalPlan}), adding ${creditsToAdd} to reach maximum`
    );
    await grantCredits(userId, creditsToAdd, "MONTHLY_TOPUP", {
      plan: finalPlan,
      previousPlan: subscription.plan,
      previousRenewsAt: subscription.renewsAt,
      currentCredits: updatedCredits,
      maxCredits,
      creditsAdded: creditsToAdd,
    });
  }

  // Update subscription renewal date and plan/status if changed
  const nextRenewal = new Date(now);
    nextRenewal.setMonth(nextRenewal.getMonth() + 1);

  await prisma.subscriptions.update({
    where: { userId },
    data: {
      plan: finalPlan,
      status: finalStatus,
      renewsAt: nextRenewal,
      // If downgraded to FREE, clear Stripe subscription ID
      ...(finalPlan === Plan.FREE && subscription.plan !== Plan.FREE
        ? { stripeSubId: null }
        : {}),
    },
  });

  if (finalPlan === Plan.FREE && subscription.plan !== Plan.FREE) {
    console.log(
      `[Top-up] ✅ User ${userId} downgraded from ${subscription.plan} to FREE plan`
    );
  }
}

/**
 * Assert that user has credits available
 */
export async function assertCreditsAvailable(userId: string): Promise<void> {
  const balance = await getCreditBalance(userId);
  if (balance <= 0) {
    throw new InsufficientCreditsError();
  }
}
