import crypto from "crypto";

type NX = "NX" | undefined;
type EX = number | undefined; // seconds

interface RedisLike {
	set(key: string, value: string, mode?: NX, ex?: EX): Promise<"OK" | null>;
	get(key: string): Promise<string | null>;
	del(key: string): Promise<number>;
}

class MemoryRedisLike implements RedisLike {
	private store = new Map<string, { value: string; expiresAt: number }>();

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
}

let client: RedisLike | null = null;

export function getRedisLike(): RedisLike {
	if (client) return client;
	const url = process.env.REDIS_URL;
	if (url) {
		try {
			// Lazy import ioredis only if available
			// eslint-disable-next-line @typescript-eslint/no-var-requires
			const IORedis = require("ioredis");
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


