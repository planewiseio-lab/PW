import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

function parseCsv(value?: string): string[] {
	return (value || "")
		.split(",")
		.map((v) => v.trim())
		.filter(Boolean);
}

function getClientIpFromHeaders(request: NextRequest, trustedProxies: string[]): string {
	// If behind trusted proxy, use x-forwarded-for (first IP)
	const proxyIp = request.headers.get("x-real-ip") || "";
	if (proxyIp && trustedProxies.includes(proxyIp)) {
		const xff = request.headers.get("x-forwarded-for");
		if (xff) {
			const first = xff.split(",")[0]?.trim();
			if (first) return first;
		}
	}
	// Fallback to x-real-ip, then 127.0.0.1 in dev
	const real = request.headers.get("x-real-ip");
	if (real) return real;
	return process.env.NODE_ENV === "development" ? "127.0.0.1" : "0.0.0.0";
}

// Simple in-memory rate limit per IP: 1 request per windowMs
const rlMap = new Map<string, number>();

export async function guardAdminReset(request: NextRequest): Promise<
	| { ok: true; ip: string }
	| { ok: false; response: NextResponse }
> {
	const secret = process.env.SECRET_ADMIN_RESET;
	if (!secret) {
		logger.error("Admin reset secret not configured");
		return {
			ok: false,
			response: NextResponse.json({ error: "SERVER_MISCONFIG" }, { status: 500 }),
		};
	}

	const trustedProxies = parseCsv(process.env.TRUSTED_PROXIES);
	const allowlist = parseCsv(process.env.ADMIN_RESET_ALLOWLIST);

	const provided =
		request.headers.get("x-admin-token") ||
		request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

	if (!provided || provided !== secret) {
		logger.warn("Admin reset unauthorized (token)", { path: request.nextUrl.pathname });
		return {
			ok: false,
			response: NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 }),
		};
	}

	const ip = getClientIpFromHeaders(request, trustedProxies);
	if (allowlist.length > 0 && !allowlist.includes(ip)) {
		logger.warn("Admin reset forbidden (ip)", { ip });
		return {
			ok: false,
			response: NextResponse.json({ error: "FORBIDDEN_IP" }, { status: 403 }),
		};
	}

	// Rate limit: 1 req / 30s per IP
	const now = Date.now();
	const last = rlMap.get(ip) || 0;
	if (now - last < 30_000) {
		logger.warn("Admin reset rate limited", { ip });
		return {
			ok: false,
			response: NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 }),
		};
	}
	rlMap.set(ip, now);

	return { ok: true, ip };
}


