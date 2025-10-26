import { prisma } from "@/lib/prisma";
import { ActionType, CreditReason, Plan } from "@prisma/client";

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
  const balance = await prisma.creditBalance.findUnique({
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
  const items = await prisma.creditLedger.findMany({
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
 * Grant credits to a user
 */
export async function grantCredits(
  userId: string,
  amount: number,
  reason: "MONTHLY_TOPUP" | "MANUAL_ADJUST" | "PURCHASE",
  metadata?: any
): Promise<void> {
  if (amount <= 0) {
    throw new Error("Amount must be positive");
  }

  await prisma.$transaction(async (tx) => {
    // Create ledger entry
    await tx.creditLedger.create({
      data: {
        userId,
        delta: amount,
        reason: reason as CreditReason,
        metadata,
      },
    });

    // Update balance
    await tx.creditBalance.upsert({
      where: { userId },
      update: { credits: { increment: amount } },
      create: { userId, credits: amount },
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
    const existingEvent = await tx.usageEvent.findUnique({
      where: { idempotencyKey: key },
    });

    if (existingEvent) {
      // Return current balance without charging again
      const balance = await tx.creditBalance.findUnique({
        where: { userId },
        select: { credits: true },
      });
      return { newBalance: balance?.credits ?? 0 };
    }

    // Get current balance with row lock
    const balance = await tx.creditBalance.findUnique({
      where: { userId },
      select: { credits: true },
    });

    const currentCredits = balance?.credits ?? 0;

    // Check if user has sufficient credits
    if (currentCredits < 1) {
      throw new InsufficientCreditsError();
    }

    // Create usage event
    await tx.usageEvent.create({
      data: {
        userId,
        actionType,
        idempotencyKey: key,
        cost: 1,
      },
    });

    // Create ledger entry
    await tx.creditLedger.create({
      data: {
        userId,
        delta: -1,
        reason: CreditReason.ACTION,
        actionType,
        refId,
        metadata,
      },
    });

    // Update balance
    await tx.creditBalance.upsert({
      where: { userId },
      update: { credits: { decrement: 1 } },
      create: { userId, credits: currentCredits - 1 },
    });

    return { newBalance: currentCredits - 1 };
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
  const totalCost = actions.length;

  // Generate base idempotency key if not provided
  const baseKey = baseIdempotencyKey || `${userId}-multi-${Date.now()}-${Math.random()}`;

  return await prisma.$transaction(async (tx) => {
    // Check if this multi-action was already processed (idempotency)
    const existingEvent = await tx.usageEvent.findUnique({
      where: { idempotencyKey: baseKey },
    });

    if (existingEvent) {
      // Return current balance without charging again
      const balance = await tx.creditBalance.findUnique({
        where: { userId },
        select: { credits: true },
      });
      return { 
        newBalance: balance?.credits ?? 0, 
        chargedActions: actions.map(a => a.actionType) 
      };
    }

    // Get current balance with row lock
    const balance = await tx.creditBalance.findUnique({
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
      
      await tx.usageEvent.create({
        data: {
          userId,
          actionType: action.actionType,
          idempotencyKey: actionKey,
          cost: 1,
        },
      });

      // Create ledger entry for each action
      await tx.creditLedger.create({
        data: {
          userId,
          delta: -1,
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
    await tx.creditBalance.upsert({
      where: { userId },
      update: { credits: { decrement: totalCost } },
      create: { userId, credits: currentCredits - totalCost },
    });

    return { 
      newBalance: currentCredits - totalCost, 
      chargedActions: actions.map(a => a.actionType) 
    };
  });
}

/**
 * Ensure top-up is applied based on subscription plan and timing
 */
export async function ensureMonthlyTopUp(userId: string): Promise<void> {
  const subscription = await prisma.subscription.findUnique({
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

  // Calculate credits by plan
  const creditsByPlan = {
    [Plan.FREE]: 5, // 5 crédits par jour
    [Plan.PRO]: 500, // 500 crédits par mois
    [Plan.BUSINESS]: 2500, // 2500 crédits par mois
  };

  const creditsToGrant = creditsByPlan[subscription.plan];

  // Grant credits
  await grantCredits(userId, creditsToGrant, "MONTHLY_TOPUP", {
    plan: subscription.plan,
    previousRenewsAt: subscription.renewsAt,
  });

  // Update subscription renewal date based on plan
  const nextRenewal = new Date(now);

  if (subscription.plan === Plan.FREE) {
    // FREE plan: daily renewal
    nextRenewal.setDate(nextRenewal.getDate() + 1);
  } else {
    // PRO/BUSINESS plans: monthly renewal
    nextRenewal.setMonth(nextRenewal.getMonth() + 1);
  }

  await prisma.subscription.update({
    where: { userId },
    data: { renewsAt: nextRenewal },
  });
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
