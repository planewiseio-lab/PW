import { NextResponse } from "next/server";
import { getRedisLike } from "@/lib/redisClient";

export const runtime = "nodejs";

async function checkABD() {
	try {
		const base = process.env.API_MARKET_BASE_URL || process.env.AIRREG_API_BASE || "https://prod.api.market/api/v1/aedbx/aerodatabox";
		const key = process.env.API_MARKET_KEY || process.env.AIRREG_API_KEY;
		const url = `${base}/airports/icao/CYUL`;
		const ctl = new AbortController();
		setTimeout(() => ctl.abort(), 1500);
		const res = await fetch(url, { headers: { Accept: "application/json", "x-magicapi-key": String(key||""), "x-api-market-key": String(key||"") }, signal: ctl.signal });
		return res.ok;
	} catch { return false; }
}

export async function GET() {
	const checks: any = { timestamp: new Date().toISOString() };
	let ok = true;

	// Redis
	try { await getRedisLike().get("health:ping"); checks.redis = true; } catch { checks.redis = false; ok = false; }

	// ABD upstream
	checks.abd = await checkABD();
	if (!checks.abd) ok = false;

	return NextResponse.json({ ok, checks }, { status: ok ? 200 : 503 });
}







