import { NextRequest, NextResponse } from "next/server";
import { resetGuestQuota, getGuestQuotaStats } from "@/lib/guestQuota";

export async function POST(request: NextRequest) {
  try {
    const adminToken = process.env.ADMIN_TOKEN || process.env.NEXT_PUBLIC_ADMIN_TOKEN;
    const provided = request.headers.get("x-admin-token") || request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

    if (!adminToken || !provided || provided !== adminToken) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const ip = String(body?.ip || "").trim();
    if (!ip) {
      return NextResponse.json({ error: "IP_REQUIRED" }, { status: 400 });
    }

    await resetGuestQuota(ip);
    const stats = await getGuestQuotaStats(ip);

    return NextResponse.json({ success: true, ip, stats });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "RESET_FAILED" }, { status: 500 });
  }
}



