import crypto from "crypto";

type NX = "NX" | undefined;
type EX = number | undefined; // seconds

interface RedisLike {
    set(key: string, value: string, mode?: NX, ex?: EX): Promise<"OK" | null>;
    get(key: string): Promise<string | null>;
    del(key: string): Promise<number>;
    // Sorted set subset for sliding window
    zadd(key: string, score: number, member: string): Promise<number>;
    zremrangebyscore(key: string, min: number, max: number): Promise<number>;
    zcard(key: string): Promise<number>;
    zrange(key: string, start: number, stop: number): Promise<string[]>;
    expire(key: string, seconds: number): Promise<number>;
}

class MemoryRedisLike implements RedisLike {
	private store = new Map<string, { value: string; expiresAt: number }>();
    private zsets = new Map<string, Map<string, number>>();

	async set(key: string, value: string, mode?: NX, ex?: EX) {
		const now = Date.now();
		const existing = this.store.get(key);
		if (mode === "NX" && existing && existing.expiresAt > now) {
			return null;
		}
		const ttl = (ex ?? 0) * 1000;
		this.store.set(key, { value, expiresAt: now + ttl });
		return "OK" as const;
	}

	async get(key: string) {
		const now = Date.now();
		const entry = this.store.get(key);
		if (!entry) return null;
		if (entry.expiresAt && entry.expiresAt <= now) {
			this.store.delete(key);
			return null;
		}
		return entry.value;
	}

	async del(key: string) {
		const existed = this.store.delete(key);
		return existed ? 1 : 0;
	}

    private getZ(key: string) {
        if (!this.zsets.has(key)) this.zsets.set(key, new Map());
        return this.zsets.get(key)!;
    }

    async zadd(key: string, score: number, member: string) {
        const z = this.getZ(key);
        const existed = z.has(member) ? 0 : 1;
        z.set(member, score);
        return existed;
    }
    async zremrangebyscore(key: string, min: number, max: number) {
        const z = this.getZ(key);
        let removed = 0;
        for (const [m, s] of Array.from(z.entries())) {
            if (s >= min && s <= max) {
                z.delete(m);
                removed++;
            }
        }
        return removed;
    }
    async zcard(key: string) {
        const z = this.getZ(key);
        return z.size;
    }
    async zrange(key: string, start: number, stop: number) {
        const z = this.getZ(key);
        const arr = Array.from(z.entries()).sort((a, b) => a[1] - b[1]).map(([m]) => m);
        const normStop = stop < 0 ? arr.length - 1 : stop;
        return arr.slice(start, normStop + 1);
    }
    async expire(_key: string, _seconds: number) {
        // no-op for memory mock
        return 1;
    }
}

let client: RedisLike | null = null;

export function getRedisLike(): RedisLike {
	if (client) return client;
	const url = process.env.REDIS_URL;
	if (url) {
		try {
			// Lazy import ioredis only if available
			// This will only execute at runtime if REDIS_URL is set
			// The module is marked as external in next.config.ts to avoid bundling issues
			let IORedis: any;
			try {
			// Dynamic require - only evaluated at runtime
			// This should work because ioredis is in serverComponentsExternalPackages
			// Using Function constructor to prevent static analysis by bundler
			// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-implied-eval
			IORedis = new Function('return require("ioredis")')();
			} catch (importError: any) {
				// ioredis not available, fall through to memory client
				console.log("[Redis] ioredis not available, using in-memory fallback");
				throw new Error("ioredis not available");
			}
			
			const redis = new IORedis(url);
			client = {
				async set(key: string, value: string, mode?: NX, ex?: EX) {
					if (mode === "NX" && ex) {
						const res = await redis.set(key, value, "EX", ex, "NX");
						return res as "OK" | null;
					}
					if (ex) return (await redis.set(key, value, "EX", ex)) as "OK";
					return (await redis.set(key, value)) as "OK";
				},
				async get(key: string) {
					return (await redis.get(key)) as string | null;
				},
				async del(key: string) {
					return (await redis.del(key)) as number;
				},
                async zadd(key: string, score: number, member: string) {
                    // ioredis: ZADD key score member
                    return (await redis.zadd(key, score, member)) as number;
                },
                async zremrangebyscore(key: string, min: number, max: number) {
                    return (await redis.zremrangebyscore(key, min, max)) as number;
                },
                async zcard(key: string) {
                    return (await redis.zcard(key)) as number;
                },
                async zrange(key: string, start: number, stop: number) {
                    return (await redis.zrange(key, start, stop)) as string[];
                },
                async expire(key: string, seconds: number) {
                    return (await redis.expire(key, seconds)) as number;
                },
			};
			return client;
		} catch {
			// fallthrough to memory
		}
	}
	client = new MemoryRedisLike();
	return client;
}

export function sha1(input: string) {
	return crypto.createHash("sha1").update(input).digest("hex");
}


