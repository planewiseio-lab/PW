import { describe, it, expect } from "vitest";
import { withIdempotency } from "@/lib/idempotency";
import { NextRequest, NextResponse } from "next/server";

function makeReq(method: string, url = "http://localhost/api/charge", headers: Record<string, string> = {}, body?: any) {
	const init: any = { method, headers: new Headers(headers) };
	if (body) init.body = JSON.stringify(body);
	// @ts-ignore minimal mock
	return new NextRequest(url, init);
}

describe("withIdempotency", () => {
	it("requires Idempotency-Key for POST", async () => {
		const handler = async () => NextResponse.json({ ok: true });
		const wrapped = withIdempotency(handler);
		const req = makeReq("POST");
		const res = await wrapped(req);
		expect(res.status).toBe(400);
	});

	it("same key returns cached response", async () => {
		let count = 0;
		const handler = async () => {
			count++;
			return NextResponse.json({ ok: true, count });
		};
		const wrapped = withIdempotency(handler, { responseTtlSeconds: 3600 });
		const headers = { "Idempotency-Key": "abc123" };
		const req1 = makeReq("POST", undefined, headers, { amount: 1 });
		const res1 = await wrapped(req1);
		expect(res1.status).toBe(200);
		const data1 = await (res1 as any).json();
		expect(data1.count).toBe(1);
		const req2 = makeReq("POST", undefined, headers, { amount: 1 });
		const res2 = await wrapped(req2);
		const data2 = await (res2 as any).json();
		expect(data2.count).toBe(1);
	});

	it("different keys run new transaction", async () => {
		let count = 0;
		const handler = async () => NextResponse.json({ ok: true, id: ++count });
		const wrapped = withIdempotency(handler);
		const r1 = await wrapped(makeReq("POST", undefined, { "Idempotency-Key": "k1" }));
		expect((await (r1 as any).json()).id).toBe(1);
		const r2 = await wrapped(makeReq("POST", undefined, { "Idempotency-Key": "k2" }));
		expect((await (r2 as any).json()).id).toBe(2);
	});
});


