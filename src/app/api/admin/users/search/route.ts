import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const isAdmin =
      user.user_metadata?.role === "admin" ||
      user.app_metadata?.role === "admin";

    if (!isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query) {
      return NextResponse.json(
        { error: "Query parameter is required" },
        { status: 400 }
      );
    }

    // Search users by email or user ID
    // Note: This is a simplified search - in production you'd want to use
    // Supabase's admin API or a more sophisticated search
    const subscriptions = await prisma.subscription.findMany({
      where: {
        OR: [
          { userId: { contains: query, mode: "insensitive" } },
          // You might want to add email search here if you store emails
        ],
      },
      take: 10,
    });

    // Get credit balances for each user
    const users = await Promise.all(
      subscriptions.map(async (subscription) => {
        const creditBalance = await prisma.creditBalance.findUnique({
          where: { userId: subscription.userId },
        });
        return {
          ...subscription,
          creditBalance,
        };
      })
    );

    const results = users.map((user) => ({
      id: user.userId,
      email: `user-${user.userId.slice(0, 8)}@example.com`, // Placeholder email
      credits: user.creditBalance?.credits || 0,
      plan: user.plan,
      status: user.status,
    }));

    return NextResponse.json({ users: results });
  } catch (error) {
    console.error("Admin user search error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
