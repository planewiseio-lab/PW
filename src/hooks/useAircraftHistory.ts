"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type FlightsResponse = {
	flights?: any[];
	pagination?: { total: number; limit: number; offset: number; hasMore: boolean };
};

const memoryCache = new Map<string, { data: FlightsResponse; ts: number }>();
const inFlightMap = new Map<string, Promise<FlightsResponse>>();
const CONTEXT_TTL_MS = 60_000; // 60s

export function useAircraftHistory(registration: string | undefined, days: number) {
	const [data, setData] = useState<FlightsResponse | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const abortRef = useRef<AbortController | null>(null);
	const debounceRef = useRef<NodeJS.Timeout | null>(null);
	const lastKeyRef = useRef<string | null>(null);

	const key = useMemo(() => {
		const d = Math.max(1, Math.min(30, Number(days || 3)));
		return registration ? `history:${registration.toUpperCase()}:${d}` : "";
	}, [registration, days]);

	const load = async () => {
		if (!registration || !key) return;
		setIsLoading(true);
		setError(null);

		// cache
		const cached = memoryCache.get(key);
		if (cached && Date.now() - cached.ts < CONTEXT_TTL_MS) {
			setData(cached.data);
			setIsLoading(false);
			return;
		}

		// singleflight
		if (inFlightMap.has(key)) {
			try {
				const shared = await inFlightMap.get(key)!;
				setData(shared);
			} catch (e: any) {
				setError(e?.message || "Failed to fetch flight history");
			} finally {
				setIsLoading(false);
			}
			return;
		}

		// abort previous
		if (abortRef.current) abortRef.current.abort();
		const controller = new AbortController();
		abortRef.current = controller;

		const promise = (async () => {
			const resp = await fetch(`/api/aircraft/${registration}/flights?days=${days}`, {
				cache: "no-store",
				signal: controller.signal,
			});
			if (!resp.ok) {
				if (resp.status === 429) throw new Error("GUEST_QUOTA_EXCEEDED");
				throw new Error("Failed to fetch flight history");
			}
			return (await resp.json()) as FlightsResponse;
		})();

		inFlightMap.set(key, promise);
		try {
			const result = await promise;
			memoryCache.set(key, { data: result, ts: Date.now() });
			setData(result);
		} catch (e: any) {
			if (e?.name === "AbortError") return; // ignore abort
			setError(e?.message || "Failed to fetch flight history");
		} finally {
			inFlightMap.delete(key);
			setIsLoading(false);
		}
	};

	const schedule = () => {
		if (!registration) return;
		if (debounceRef.current) clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => {
			load();
		}, 300);
	};

	useEffect(() => {
		if (!registration) return;
		if (lastKeyRef.current !== key) {
			lastKeyRef.current = key;
			schedule();
		}
		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current);
		};
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [key]);

	return {
		data,
		error,
		isLoading,
		refetch: load,
	};
}


