import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAircraftHistory } from "@/hooks/useAircraftHistory";

beforeEach(() => {
	// @ts-ignore
	global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ flights: [] }) }));
});

describe("useAircraftHistory", () => {
	it("debounces fetch calls", async () => {
		const { result, rerender } = renderHook(({ reg, days }) => useAircraftHistory(reg, days), {
			initialProps: { reg: "C-GKXR", days: 3 },
		});
		await act(async () => {
			rerender({ reg: "C-GKXR", days: 4 });
			rerender({ reg: "C-GKXR", days: 5 });
		});
		// wait a bit more than debounce
		await new Promise((r) => setTimeout(r, 350));
		expect(result.current.isLoading).toBe(false);
	});

	it("aborts previous request on change", async () => {
		const controllerAbort = vi.fn();
		// Simulate slow response then fast rerender
		// @ts-ignore
		global.fetch = vi.fn((input: RequestInfo, init?: RequestInit) => {
			const ctl: any = (init as any)?.signal;
			if (ctl) ctl.addEventListener("abort", controllerAbort);
			return new Promise((resolve) => setTimeout(() => resolve({ ok: true, json: async () => ({ flights: [] }) } as any), 200));
		});

		const { rerender } = renderHook(({ reg, days }) => useAircraftHistory(reg, days), {
			initialProps: { reg: "C-FRSR", days: 3 },
		});
		renderHook(() => {});
		await act(async () => {
			rerender({ reg: "C-FRSR", days: 4 });
		});
		await new Promise((r) => setTimeout(r, 400));
		expect(controllerAbort).toHaveBeenCalled();
	});
});


