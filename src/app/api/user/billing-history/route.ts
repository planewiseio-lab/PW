import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getPaddleConfig } from "@/lib/paddle";

const PADDLE_API_URL = process.env.PADDLE_API_URL || "https://api.paddle.com";

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

    // Get user's subscription to find Paddle transaction ID
    const subscription = await prisma.subscriptions.findUnique({
      where: { userId: user.id },
    });

    if (!subscription?.paddleTransactionId && !subscription?.paddleSubscriptionId) {
      return NextResponse.json({ invoices: [] });
    }

    try {
      const { apiKey } = getPaddleConfig();
      
      // Fetch transactions from Paddle
      // Paddle API allows filtering by customer_id or subscription_id
      const customerId = `user_${user.id}`;
      
      // Fetch transactions for this customer
      const response = await fetch(
        `${PADDLE_API_URL}/transactions?customer_id=${encodeURIComponent(customerId)}`,
        {
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Accept": "application/json",
          },
        }
      );

      if (!response.ok) {
        console.error("Failed to fetch Paddle transactions:", response.statusText);
        return NextResponse.json({ invoices: [] });
      }

      const data = await response.json();
      const transactions = data.data || [];

      // Format transactions for display
      const formattedInvoices = transactions.map((transaction: any) => ({
        id: transaction.id,
        amount: parseFloat(transaction.totals?.total || "0") / 100, // Convert from cents to dollars
        currency: transaction.currency_code || "USD",
        status: transaction.status,
        date: transaction.created_at,
        invoiceUrl: transaction.invoice_url || null,
        description: transaction.items?.[0]?.product?.name || "Subscription",
        lineItems: transaction.items?.map((item: any) => ({
          description: item.product?.name || "Subscription",
          amount: parseFloat(item.totals?.total || "0") / 100,
          quantity: item.quantity || 1,
        })) || [],
      }));

      return NextResponse.json({ invoices: formattedInvoices });
    } catch (apiError) {
      console.error("Error fetching Paddle transactions:", apiError);
      // Return empty array if API call fails
      return NextResponse.json({ invoices: [] });
    }
  } catch (error) {
    console.error("Error fetching billing history:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

