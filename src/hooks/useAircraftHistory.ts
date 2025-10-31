"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type FlightsResponse = {
	flights?: any[];
	pagination?: { total: number; limit: number; offset: number; hasMore: boolean };
};

const memoryCache = new Map<string, { data: FlightsResponse; ts: number }>();
const inFlightMap = new Map<string, Promise<FlightsResponse>>();
const CONTEXT_TTL_MS = 60_000; // 60s
const REQUEST_TIMEOUT_MS = 5000; // abort network after 5s (API usually responds in 2-4s)

export function useAircraftHistory(registration: string | undefined, days: number) {
	const [data, setData] = useState<FlightsResponse | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState<boolean>(!!registration);
	const abortRef = useRef<AbortController | null>(null);
	const debounceRef = useRef<NodeJS.Timeout | null>(null);
	const lastKeyRef = useRef<string | null>(null);

	const key = useMemo(() => {
		const d = Math.max(1, Math.min(30, Number(days || 3)));
		return registration ? `history:${registration.toUpperCase()}:${d}` : "";
	}, [registration, days]);

	const load = async () => {
		if (!registration || !key) {
			setIsLoading(false);
			return;
		}
		
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

		const url = `/api/aircraft/${registration}/flights?days=${days}`;

		const promise = (async () => {
			const timeoutId = setTimeout(() => {
				console.warn(`[useAircraftHistory] Request timeout after ${REQUEST_TIMEOUT_MS}ms`);
				controller.abort();
			}, REQUEST_TIMEOUT_MS);
			try {
				const resp = await fetch(url, {
					cache: "no-store",
					signal: controller.signal,
				});
				clearTimeout(timeoutId);
				if (!resp.ok) {
					if (resp.status === 429) throw new Error("GUEST_QUOTA_EXCEEDED");
					const errorText = await resp.text().catch(() => "Unknown error");
					throw new Error(`Failed to fetch flight history: ${resp.status} ${errorText}`);
				}
				const json = await resp.json();
				return json as FlightsResponse;
			} catch (e: any) {
				clearTimeout(timeoutId);
				if (e?.name === "AbortError") {
					// Request was aborted, ignore
				}
				throw e;
			}
		})();

		inFlightMap.set(key, promise);
		try {
			const result = await promise;
			memoryCache.set(key, { data: result, ts: Date.now() });
			setData(result);
		} catch (e: any) {
			if (e?.name === "AbortError") {
				// ignore abort - cleanup handled in finally
			} else {
				setError(e?.message || "Failed to fetch flight history");
			}
		} finally {
			inFlightMap.delete(key);
			setIsLoading(false);
		}
	};

	const schedule = () => {
		if (!registration) {
			setIsLoading(false);
			return;
		}
		// Avoid empty-state flash by marking loading immediately
		setIsLoading(true);
		if (debounceRef.current) {
			clearTimeout(debounceRef.current);
			debounceRef.current = null;
		}
		// Call load immediately to avoid React Strict Mode timeout cancellation issues
		load().catch((e) => {
			setIsLoading(false);
			setError(e?.message || "Failed to fetch flight history");
		});
	};

	useEffect(() => {
		if (!registration) {
			setIsLoading(false);
			return;
		}
		if (lastKeyRef.current !== key) {
			lastKeyRef.current = key;
			schedule();
		}
		return () => {
			if (debounceRef.current) {
				clearTimeout(debounceRef.current);
				debounceRef.current = null;
			}
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


