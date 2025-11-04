import crypto from "crypto";
import {
  getCache,
  setCache,
  setCacheNX,
  deleteCache,
  incrementCache,
  getCacheTTL,
  zaddCache,
  zremrangebyscoreCache,
  zcardCache,
  zrangeCache,
  expireCache,
} from "./supabaseCache";

/**
 * Supabase-based Redis client implementation
 * Replaces Redis with PostgreSQL/Supabase for cache operations
 */

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

class SupabaseRedisLike implements RedisLike {
  async set(key: string, value: string, mode?: NX, ex?: EX): Promise<"OK" | null> {
    if (mode === "NX") {
      // Set only if not exists
      const success = await setCacheNX(key, value, ex || 3600);
      return success ? "OK" : null;
    }

    // Normal set
    const success = await setCache(key, value, ex);
    return success ? "OK" : null;
  }

  async get(key: string): Promise<string | null> {
    return await getCache(key);
  }

  async del(key: string): Promise<number> {
    return await deleteCache(key);
  }

  async zadd(key: string, score: number, member: string): Promise<number> {
    // Default TTL for sorted sets: 1 hour
    return await zaddCache(key, score, member, 3600);
  }

  async zremrangebyscore(key: string, min: number, max: number): Promise<number> {
    return await zremrangebyscoreCache(key, min, max);
  }

  async zcard(key: string): Promise<number> {
    return await zcardCache(key);
  }

  async zrange(key: string, start: number, stop: number): Promise<string[]> {
    return await zrangeCache(key, start, stop);
  }

  async expire(key: string, seconds: number): Promise<number> {
    return await expireCache(key, seconds);
  }
}

let client: RedisLike | null = null;

export function getRedisLike(): RedisLike {
  if (client) return client;

  // Check if we should use Supabase cache instead of Redis
  const useSupabaseCache = process.env.USE_SUPABASE_CACHE === "true" || !process.env.REDIS_URL;

  if (useSupabaseCache) {
    console.log("[Redis] Using Supabase PostgreSQL cache instead of Redis");
    client = new SupabaseRedisLike();
    return client;
  }

  // Fallback to original Redis implementation if REDIS_URL is set
  // This keeps backward compatibility
  const url = process.env.REDIS_URL;
  if (url) {
    try {
      // Lazy import ioredis only if available
      let IORedis: any;
      try {
        // Dynamic require - only evaluated at runtime
        // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-implied-eval
        IORedis = new Function('return require("ioredis")')();
      } catch (importError: any) {
        // ioredis not available, fall through to Supabase cache
        console.log("[Redis] ioredis not available, using Supabase cache");
        client = new SupabaseRedisLike();
        return client;
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
      // fallthrough to Supabase cache
    }
  }

  // Default to Supabase cache
  client = new SupabaseRedisLike();
  return client;
}

export function sha1(input: string) {
  return crypto.createHash("sha1").update(input).digest("hex");
}

