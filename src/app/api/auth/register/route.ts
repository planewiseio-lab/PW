import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/guestQuota";
import { Plan, SubscriptionStatus } from "@prisma/client";
import { grantCredits } from "@/lib/credits";
import { randomUUID } from "crypto";

const REGISTRATION_IP_CHECK_DAYS = 90;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, fullName } = body;

    // Validation
    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: "Email, password, and full name are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    if (
      !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(password)
    ) {
      return NextResponse.json(
        {
          error:
            "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
        },
        { status: 400 }
      );
    }

    // Get client IP
    const clientIp = getClientIp(request);

    // Check if an account was created from the same IP in the last 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - REGISTRATION_IP_CHECK_DAYS);

    const existingProfile = await prisma.profiles.findFirst({
      where: {
        registration_ip: clientIp,
        created_at: {
          gte: ninetyDaysAgo,
        },
      },
      orderBy: {
        created_at: "desc",
      },
    });

    // If an account exists from the same IP, return information for recovery
    if (existingProfile) {
      // Try to get Supabase user to get email
      const { data: supabaseUsers } = await supabaseAdmin.auth.admin.listUsers();
      const supabaseUser = supabaseUsers?.users.find(
        (u) => u.id === existingProfile.id
      );

      return NextResponse.json(
        {
          error: "EXISTING_ACCOUNT_FOUND",
          message:
            "An account was created from this IP address recently. Would you like to recover your existing account?",
          existingAccount: {
            userId: existingProfile.id,
            email: supabaseUser?.email || existingProfile.email,
            createdAt: existingProfile.created_at,
            canRecover: true,
          },
        },
        { status: 409 }
      );
    }

    // Create account via Supabase Auth
    const supabase = await createClient();
    const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin}/auth/callback`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      return NextResponse.json(
        { error: error.message || "An error occurred during signup" },
        { status: 400 }
      );
    }

    if (!data.user) {
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 }
      );
    }

    const userId = data.user.id;

    // Wait a bit for Supabase trigger to create the profile
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Check if profile exists, create it if trigger didn't work
    try {
      let profile = await prisma.profiles.findUnique({
        where: { id: userId },
      });

      if (!profile) {
        // Create profile manually if trigger didn't create it
        console.log(`[Register] Profile not found for ${userId}, creating manually...`);
        profile = await prisma.profiles.create({
          data: {
            id: userId,
            email: email,
            full_name: fullName,
            registration_ip: clientIp,
          },
        });
      } else {
        // Update existing profile with registration IP
        await prisma.profiles.update({
          where: { id: userId },
          data: { registration_ip: clientIp },
        });
      }
    } catch (profileError) {
      console.error("[Register] Error creating/updating profile:", profileError);
      // Continue even if profile creation/update fails
    }

    // Check if subscription already exists (created by Supabase trigger or other)
    let subscription = await prisma.subscriptions.findUnique({
      where: { userId },
    });

    // Calculate renewal date (1 month from now)
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    // If no subscription exists, create a FREE subscription
    if (!subscription) {
      subscription = await prisma.subscriptions.create({
        data: {
          id: randomUUID(),
          userId,
          plan: Plan.FREE,
          status: SubscriptionStatus.ACTIVE,
          renewsAt: nextMonth,
        },
      });
    } else {
      // Ensure existing subscription is set to FREE plan with correct renewal date
      subscription = await prisma.subscriptions.update({
        where: { userId },
        data: {
          plan: Plan.FREE,
          status: SubscriptionStatus.ACTIVE,
          renewsAt: nextMonth,
        },
      });
    }

    // Initialize credits (50 for FREE)
    await grantCredits(userId, 50, "MANUAL_ADJUST", {
      plan: Plan.FREE,
      registrationIp: clientIp,
      reason: "initial_account_creation",
    });

    return NextResponse.json({
      success: true,
      message: "Account created successfully! Check your email for the confirmation link.",
      userId,
    });
  } catch (error: any) {
    console.error("[Register] Error:", error);
    return NextResponse.json(
      {
        error: error.message || "An error occurred during signup",
      },
      { status: 500 }
    );
  }
}

