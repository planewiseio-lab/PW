import { NextRequest, NextResponse } from "next/server";

// Access token for testers (change in production)
// You can also use an environment variable
const TEST_ACCESS_TOKEN = process.env.TEST_ACCESS_TOKEN || "test-paddle-2024";

// List of authorized emails (optional)
const AUTHORIZED_EMAILS = process.env.AUTHORIZED_EMAILS
  ? process.env.AUTHORIZED_EMAILS.split(",").map((e) => e.trim())
  : [];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, email } = body;

    if (!token) {
      return NextResponse.json(
        { valid: false, error: "Token required" },
        { status: 400 }
      );
    }

    // Verify the token
    if (token === TEST_ACCESS_TOKEN) {
      // If an email whitelist is configured, verify the email
      if (AUTHORIZED_EMAILS.length > 0 && email) {
        if (!AUTHORIZED_EMAILS.includes(email.toLowerCase())) {
          return NextResponse.json(
            {
              valid: false,
              error: "Email not authorized. Contact support to get access.",
            },
            { status: 403 }
          );
        }
      }

      return NextResponse.json({ valid: true });
    }

    return NextResponse.json(
      { valid: false, error: "Invalid token" },
      { status: 401 }
    );
  } catch (error) {
    console.error("[Test Access] Error:", error);
    return NextResponse.json(
      { valid: false, error: "Server error" },
      { status: 500 }
    );
  }
}

