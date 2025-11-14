import { NextRequest, NextResponse } from "next/server";
import { resetGuestQuota, getGuestQuotaStats } from "@/lib/guestQuota";
import { guardAdminReset } from "@/lib/security/adminResetGuard";
import { logger } from "@/lib/logger";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const guard = await guardAdminReset(request);
    if (!guard.ok) return guard.response;

    const body = await request.json().catch(() => ({}));
    const ip = String(body?.ip || "").trim();
    if (!ip) {
      return NextResponse.json({ error: "IP_REQUIRED" }, { status: 400 });
    }

    await resetGuestQuota(ip);
    const stats = await getGuestQuotaStats(ip);
    logger.info("Admin guest quota reset", { ip, by: guard.ok ? "admin" : "unknown" });
    return NextResponse.json({ success: true, ip, stats });
  } catch (error: any) {
    logger.error("Admin guest quota reset failed", { error: error?.message });
    return NextResponse.json({ error: error?.message || "RESET_FAILED" }, { status: 500 });
  }
}



