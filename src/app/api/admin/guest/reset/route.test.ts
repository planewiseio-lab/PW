// Basic unit tests for admin reset guard/route
import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { guardAdminReset } from "@/lib/security/adminResetGuard";

function makeRequest(headers: Record<string, string> = {}, url = "http://localhost/api/admin/guest/reset") {
	// @ts-ignore - minimal mock of NextRequest
	return new NextRequest(url, { headers: new Headers(headers), method: "POST" });
}

describe("admin reset guard", () => {
	it("rejects when secret missing", async () => {
		delete (process as any).env.SECRET_ADMIN_RESET;
		const req = makeRequest();
		const res = await guardAdminReset(req);
		expect(res.ok).toBe(false);
	});

	it("rejects invalid token", async () => {
		process.env.SECRET_ADMIN_RESET = "s3cret";
		const req = makeRequest({ "x-admin-token": "bad" });
		const res = await guardAdminReset(req);
		expect(res.ok).toBe(false);
	});

	it("rejects non-allowlisted IP", async () => {
		process.env.SECRET_ADMIN_RESET = "s3cret";
		process.env.ADMIN_RESET_ALLOWLIST = "203.0.113.10";
		const req = makeRequest({ "x-admin-token": "s3cret", "x-real-ip": "198.51.100.5" });
		const res = await guardAdminReset(req);
		expect(res.ok).toBe(false);
	});

	it("accepts valid token and allowlisted IP", async () => {
		process.env.SECRET_ADMIN_RESET = "s3cret";
		process.env.ADMIN_RESET_ALLOWLIST = "198.51.100.5";
		const req = makeRequest({ "x-admin-token": "s3cret", "x-real-ip": "198.51.100.5" });
		const res = await guardAdminReset(req);
		expect(res.ok).toBe(true);
	});
});


