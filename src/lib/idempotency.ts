import { NextRequest, NextResponse } from "next/server";
import { getRedisLike, sha1 } from "@/lib/redisClient";

export interface IdempotencyOptions {
	responseTtlSeconds?: number; // default 24h
	requireHeaderForMethods?: Array<"POST" | "PUT" | "PATCH" | "DELETE">;
}

type Handler<T> = (request: NextRequest, ...args: any[]) => Promise<NextResponse<T> | Response>;

export function withIdempotency<T = any>(handler: Handler<T>, opts: IdempotencyOptions = {}) {
	const ttl = Math.max(60, opts.responseTtlSeconds ?? 24 * 60 * 60);
	const required = opts.requireHeaderForMethods ?? ["POST", "PUT", "PATCH", "DELETE"];
	return async (request: NextRequest, ...args: any[]) => {
		const method = request.method.toUpperCase();
		const url = new URL(request.url);
		let headerKey = request.headers.get("Idempotency-Key") || request.headers.get("idempotency-key") || "";

		// Build a stable key if header not required
		if (!headerKey && !required.includes(method as any)) {
			const bodyText = method === "GET" ? "" : await request.text();
			const fingerprint = `${method}:${url.pathname}:${url.search}:${sha1(bodyText)}`;
			headerKey = sha1(fingerprint);
		}

		if (!headerKey && required.includes(method as any)) {
			return NextResponse.json({ error: "IDEMPOTENCY_KEY_REQUIRED" }, { status: 400 });
		}

		const redis = getRedisLike();
		const respKey = `idemp:resp:${headerKey}`;
		const lockKey = `idemp:lock:${headerKey}`;

		// If response already cached, return it
		const cached = await redis.get(respKey);
		if (cached) {
			try {
				const parsed = JSON.parse(cached);
				return NextResponse.json(parsed.body, { status: parsed.status });
			} catch {
				return NextResponse.json({ error: "IDEMPOTENCY_CACHE_ERROR" }, { status: 500 });
			}
		}

		// Try to acquire short lock to prevent duplicate processing
		const lock = await redis.set(lockKey, "1", "NX", 30);
		if (lock === null) {
			// Someone else is processing; instruct client to retry later
			return NextResponse.json({ status: "PROCESSING" }, { status: 202 });
		}

		// Execute handler
		const response = await handler(request, ...args);
		// Attempt to capture JSON body; if not JSON, just store status only
		try {
			// Clone not available; assume handler built NextResponse.json
			// @ts-ignore - NextResponse has json() only on fetch Response, so fallback
			const data = await (response as any).json?.().catch?.(() => undefined);
			const payload = JSON.stringify({ status: (response as any).status || 200, body: data ?? {} });
			await redis.set(respKey, payload, undefined, ttl);
		} catch {
			// Ignore cache store errors
		}
		return response as any;
	};
}


