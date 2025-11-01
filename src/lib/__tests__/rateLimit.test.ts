import { describe, it, expect } from "vitest";
import { withRateLimit } from "@/lib/rateLimit";
import { NextRequest, NextResponse } from "next/server";

function makeReq(url = "http://localhost/api/rl", headers: Record<string, string> = {}) {
  // @ts-ignore minimal mock
  return new NextRequest(url, { headers: new Headers({ "x-real-ip": "127.0.0.1", ...headers }) });
}

describe("withRateLimit", () => {
  it("allows up to limit and then 429", async () => {
    const handler = async () => NextResponse.json({ ok: true });
    const wrapped = withRateLimit(handler, { windowMs: 60_000, defaultLimit: 60, overrides: { "/api/rl": 60 } });
    let lastRes: any;
    for (let i = 0; i < 60; i++) {
      lastRes = await wrapped(makeReq());
      expect(lastRes.status).toBe(200);
    }
    const blocked = await wrapped(makeReq());
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("X-RateLimit-Limit")).toBe("60");
    expect(blocked.headers.get("X-RateLimit-Remaining")).toBe("0");
  });
});






