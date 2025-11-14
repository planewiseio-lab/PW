import { describe, it, expect, vi, beforeEach } from "vitest";
import { getAirport, getFlightsRelative, getHistory } from "@/services/abdClient";

beforeEach(() => {
	// @ts-ignore
	global.fetch = vi.fn(async (url: string) => {
		return {
			ok: true,
			status: 200,
			text: async () => JSON.stringify({ ok: true, url }),
		} as any;
	});
});

describe("abdClient", () => {
	it("getAirport caches and returns data", async () => {
		const r1 = await getAirport("YUL", { timeoutMs: 100, retry: 0, cacheTtlSeconds: 1 });
		expect(r1.data.data.ok).toBe(true);
		const r2 = await getAirport("YUL", { timeoutMs: 100, retry: 0, cacheTtlSeconds: 1 });
		expect(r2.data.data.ok).toBe(true);
	});

	it("getFlightsRelative succeeds with params", async () => {
		const r = await getFlightsRelative("YUL", "departures", 1, 1, { timeoutMs: 100 });
		expect(r.data.data.ok).toBe(true);
	});

	it("getHistory succeeds with params", async () => {
		const r = await getHistory("C-GKXR", "2025-10-01", "2025-10-10", { timeoutMs: 100 });
		expect(r.data.data.ok).toBe(true);
	});
});


