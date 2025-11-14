import { NextRequest, NextResponse } from "next/server";
import { createResendClient } from "@/lib/resend";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, subject, message } = body;

    // Validation
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Get email configuration from environment variables
    const resendApiKey = process.env.RESEND_API_KEY;
    const contactEmail = process.env.CONTACT_EMAIL || process.env.RESEND_FROM_EMAIL;
    const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

    // Check if Resend is configured
    if (!resendApiKey) {
      console.error("[Contact API] RESEND_API_KEY not configured");
      return NextResponse.json(
        { 
          error: "Email service not configured",
          message: "Please configure RESEND_API_KEY in your environment variables"
        },
        { status: 500 }
      );
    }

    if (!contactEmail) {
      console.error("[Contact API] CONTACT_EMAIL or RESEND_FROM_EMAIL not configured");
      return NextResponse.json(
        { 
          error: "Contact email not configured",
          message: "Please configure CONTACT_EMAIL or RESEND_FROM_EMAIL in your environment variables"
        },
        { status: 500 }
      );
    }

    // Create Resend client using wrapper (synchronous require)
    const resend = createResendClient(resendApiKey);

    // Send email using Resend
    const emailResult = await resend.emails.send({
      from: fromEmail,
      to: contactEmail,
      replyTo: email,
      subject: `Contact Form: ${subject}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background-color: #178cf2;
                color: white;
                padding: 20px;
                border-radius: 8px 8px 0 0;
              }
              .content {
                background-color: #f9fafb;
                padding: 20px;
                border: 1px solid #e5e7eb;
                border-top: none;
                border-radius: 0 0 8px 8px;
              }
              .field {
                margin-bottom: 15px;
              }
              .label {
                font-weight: bold;
                color: #374151;
                margin-bottom: 5px;
                display: block;
              }
              .value {
                color: #6b7280;
                padding: 10px;
                background-color: white;
                border-radius: 4px;
                border: 1px solid #e5e7eb;
              }
              .message {
                white-space: pre-wrap;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1 style="margin: 0;">New Contact Form Submission</h1>
            </div>
            <div class="content">
              <div class="field">
                <span class="label">Name:</span>
                <div class="value">${escapeHtml(name)}</div>
              </div>
              <div class="field">
                <span class="label">Email:</span>
                <div class="value">${escapeHtml(email)}</div>
              </div>
              <div class="field">
                <span class="label">Subject:</span>
                <div class="value">${escapeHtml(subject)}</div>
              </div>
              <div class="field">
                <span class="label">Message:</span>
                <div class="value message">${escapeHtml(message)}</div>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `
New Contact Form Submission

Name: ${name}
Email: ${email}
Subject: ${subject}

Message:
${message}
      `.trim(),
    });

    if (emailResult.error) {
      console.error("[Contact API] Resend error:", emailResult.error);
      return NextResponse.json(
        { 
          error: "Failed to send email",
          message: emailResult.error.message || "An error occurred while sending the email"
        },
        { status: 500 }
      );
    }

    console.log("[Contact API] Email sent successfully:", emailResult.data?.id);

    return NextResponse.json(
      { 
        success: true,
        message: "Your message has been sent successfully. We'll get back to you soon!"
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[Contact API] Error:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: error.message || "An unexpected error occurred"
      },
      { status: 500 }
    );
  }
}

// Helper function to escape HTML
function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

