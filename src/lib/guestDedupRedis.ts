import { NextRequest, NextResponse } from "next/server";
import { getRedisLike, sha1 } from "@/lib/redisClient";

export interface GuestDedupOptions {
	windowSeconds?: number; // default 2
	conflictResponse?: "409" | "pass"; // 409 or pass-through
}

export function guestDedupRedis<T = any>(
	handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse<T> | Response>,
	opts: GuestDedupOptions = {}
) {
	const windowSeconds = Math.max(1, opts.windowSeconds ?? 2);
	const conflict = opts.conflictResponse ?? "409";
	return async (request: NextRequest, ...args: any[]) => {
		const ip = request.headers.get("x-forwarded-for")?.split(",")?.[0]?.trim() ||
			request.headers.get("x-real-ip") ||
			(process.env.NODE_ENV === "development" ? "127.0.0.1" : "0.0.0.0");
		const url = new URL(request.url);
		const body = request.method !== "GET" ? await request.text() : "";
		const bodyHash = sha1(body);
		const key = `dedup:${ip}:${request.method}:${url.pathname}:${url.search}:${bodyHash}`;

		const redis = getRedisLike();
		const setRes = await redis.set(key, "1", "NX", windowSeconds);
		if (setRes === null) {
			// duplicate within window
			if (conflict === "409") {
				return NextResponse.json({ error: "DUPLICATE_REQUEST" }, { status: 409 });
			}
			// pass-through without blocking
		}
		return handler(request, ...args);
	};
}


