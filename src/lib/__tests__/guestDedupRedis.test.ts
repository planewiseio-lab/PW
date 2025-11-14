import { describe, it, expect } from "vitest";
import { guestDedupRedis } from "@/lib/guestDedupRedis";
import { NextRequest, NextResponse } from "next/server";

function makeReq(url = "http://localhost/api/test", headers: Record<string, string> = {}) {
	// @ts-ignore minimal mock
	return new NextRequest(url, { headers: new Headers(headers), method: "GET" });
}

describe("guestDedupRedis", () => {
	it("allows first, 409 on duplicates within window", async () => {
		const handler = async () => NextResponse.json({ ok: true });
		const wrapped = guestDedupRedis(handler, { windowSeconds: 2, conflictResponse: "409" });
		const req = makeReq("http://localhost/api/test?x=1", { "x-real-ip": "127.0.0.1" });
		const res1 = await wrapped(req);
		expect(res1.status).toBe(200);
		const res2 = await wrapped(req);
		expect(res2.status).toBe(409);
	});

	it("concurrent requests: only one passes, others 409", async () => {
		const handler = async () => NextResponse.json({ ok: true });
		const wrapped = guestDedupRedis(handler, { windowSeconds: 2, conflictResponse: "409" });
		const reqs = Array.from({ length: 10 }, () => makeReq("http://localhost/api/test?y=2", { "x-real-ip": "127.0.0.1" }));
		const results = await Promise.all(reqs.map((r) => wrapped(r)));
		const ok = results.filter((r) => r.status === 200).length;
		const conflicts = results.filter((r) => r.status === 409).length;
		expect(ok).toBe(1);
		expect(conflicts).toBe(9);
	});
});


