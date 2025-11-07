import { NextResponse } from "next/server";
import { getRedisLike } from "@/lib/redisClient";

export const runtime = "nodejs";

export async function GET() {
	const checks: any = { timestamp: new Date().toISOString() };
	let ok = true;

	// Redis
	try {
		const redis = getRedisLike();
		await redis.set("health:ping", "1", undefined, 5);
		checks.redis = true;
	} catch {
		checks.redis = false; ok = false;
	}

	return NextResponse.json({ ok, checks });
}















