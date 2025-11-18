import { NextRequest, NextResponse } from "next/server";
import { getRedisLike } from "@/lib/redisClient";

export interface RateLimitOptions {
  windowMs?: number; // default 60_000
  defaultLimit?: number; // default 60
  overrides?: Record<string, number>; // path -> limit
}

async function slidingWindowAllow(ip: string, key: string, windowMs: number, limit: number) {
  const redis = getRedisLike();
  const now = Date.now();
  const zkey = `rl:${key}:${ip}`;
  // add current timestamp as member
  await redis.zadd(zkey, now, String(now));
  // remove outside window
  await redis.zremrangebyscore(zkey, 0, now - windowMs);
  const count = await redis.zcard(zkey);
  await redis.expire(zkey, Math.ceil(windowMs / 1000));
  let reset = now + windowMs;
  const firstArr = await redis.zrange(zkey, 0, 0);
  if (firstArr.length > 0) {
    const first = Number(firstArr[0]);
    reset = first + windowMs;
  }
  return { allowed: count <= limit, remaining: Math.max(0, limit - count), resetAt: reset };
}

export function withRateLimit<T = any>(handler: (req: NextRequest, ...args: any[]) => Promise<NextResponse<T> | Response>, opts: RateLimitOptions = {}) {
  const windowMs = opts.windowMs ?? 60_000;
  const defaultLimit = opts.defaultLimit ?? 60;
  const overrides = opts.overrides ?? {};
  return async (request: NextRequest, ...args: any[]) => {
    const url = new URL(request.url);
    const path = url.pathname;
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "0.0.0.0";
    const limit = overrides[path] ?? defaultLimit;

    const { allowed, remaining, resetAt } = await slidingWindowAllow(ip!, path, windowMs, limit);
    if (!allowed) {
      const res = NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
      res.headers.set("X-RateLimit-Limit", String(limit));
      res.headers.set("X-RateLimit-Remaining", String(0));
      res.headers.set("X-RateLimit-Reset", String(Math.ceil(resetAt / 1000)));
      return res;
    }
    const response = await handler(request, ...args);
    try {
      if (response instanceof NextResponse) {
        response.headers.set("X-RateLimit-Limit", String(limit));
        response.headers.set("X-RateLimit-Remaining", String(remaining));
        response.headers.set("X-RateLimit-Reset", String(Math.ceil(resetAt / 1000)));
      }
    } catch {}
    return response;
  };
}



























