import { NextResponse } from "next/server";
import { getRedisLike } from "@/lib/redisClient";

export const runtime = "nodejs";

async function checkABD() {
	try {
		const base = process.env.AIRREG_API_BASE || "https://aerodatabox.p.rapidapi.com";
		const host = "aerodatabox.p.rapidapi.com";
		const key = process.env.AIRREG_API_KEY || process.env.RAPID_KEY;
		const url = `${base}/airports/icao/CYUL`;
		const ctl = new AbortController();
		setTimeout(() => ctl.abort(), 1500);
		const res = await fetch(url, { headers: { Accept: "application/json", "X-RapidAPI-Key": String(key||"") , "X-RapidAPI-Host": host }, signal: ctl.signal });
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






