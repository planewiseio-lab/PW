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

      // Set the cookie on the server side for better reliability
      const response = NextResponse.json({ valid: true });
      
      // Determine if we're on localhost or production
      const isLocalhost = process.env.NODE_ENV === "development";
      
      response.cookies.set("test_access_token", token, {
        path: "/",
        maxAge: 86400, // 24 hours
        sameSite: "lax",
        httpOnly: false, // Must be false to be readable by client-side JS if needed
        // On localhost, don't set domain (allows localhost:3000 to work)
        // In production, domain will be set automatically by the browser
        ...(isLocalhost ? {} : { secure: true }), // Secure only in production (HTTPS)
      });

      if (process.env.NODE_ENV === "development") {
        console.log("[Test Access] Cookie set successfully for token:", token);
      }

      return response;
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

