import { prisma } from "@/lib/prisma";

/**
 * Supabase/PostgreSQL-based cache to replace Redis
 * Uses the cache table in PostgreSQL for key-value storage
 */

interface CacheEntry {
  key: string;
  value: string;
  expires_at: Date;
}

interface SortedSetEntry {
  key: string;
  member: string;
  score: number;
  expires_at: Date;
}

/**
 * Get a value from cache
 */
export async function getCache(key: string): Promise<string | null> {
  try {
    // During build, return null to avoid database connection errors
    const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build" || 
                         (process.env.VERCEL && !process.env.DATABASE_URL && !process.env.POSTGRES_PRISMA_URL);
    if (isBuildPhase) {
      return null;
    }
    
    const entry = await prisma.$queryRaw<CacheEntry[]>`
      SELECT key, value, expires_at
      FROM cache
      WHERE key = ${key} AND expires_at > NOW()
      LIMIT 1
    `;

    if (entry.length === 0) {
      return null;
    }

    return entry[0].value;
  } catch (error: any) {
    // During build, silently fail
    const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build" || 
                         (process.env.VERCEL && !process.env.DATABASE_URL && !process.env.POSTGRES_PRISMA_URL);
    if (isBuildPhase) {
      return null;
    }
    console.error("[SupabaseCache] Error getting cache:", error);
    return null;
  }
}

/**
 * Set a value in cache with optional TTL
 */
export async function setCache(
  key: string,
  value: string,
  ttlSeconds?: number
): Promise<boolean> {
  try {
    const expiresAt = ttlSeconds
      ? new Date(Date.now() + ttlSeconds * 1000)
      : new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h default

    await prisma.$executeRaw`
      INSERT INTO cache (key, value, expires_at)
      VALUES (${key}, ${value}, ${expiresAt})
      ON CONFLICT (key) 
      DO UPDATE SET 
        value = EXCLUDED.value,
        expires_at = EXCLUDED.expires_at
    `;

    return true;
  } catch (error) {
    console.error("[SupabaseCache] Error setting cache:", error);
    return false;
  }
}

/**
 * Set a value only if it doesn't exist (NX mode)
 */
export async function setCacheNX(
  key: string,
  value: string,
  ttlSeconds: number
): Promise<boolean> {
  try {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    const result = await prisma.$executeRaw`
      INSERT INTO cache (key, value, expires_at)
      VALUES (${key}, ${value}, ${expiresAt})
      ON CONFLICT (key) DO NOTHING
    `;

    // If result is 1, the insert succeeded (key didn't exist)
    return result > 0;
  } catch (error) {
    console.error("[SupabaseCache] Error setting cache NX:", error);
    return false;
  }
}

/**
 * Delete a key from cache
 */
export async function deleteCache(key: string): Promise<number> {
  try {
    const result = await prisma.$executeRaw`
      DELETE FROM cache WHERE key = ${key}
    `;
    return result || 0;
  } catch (error) {
    console.error("[SupabaseCache] Error deleting cache:", error);
    return 0;
  }
}

/**
 * Increment a value atomically
 */
export async function incrementCache(
  key: string,
  ttlSeconds?: number
): Promise<number> {
  try {
    const expiresAt = ttlSeconds
      ? new Date(Date.now() + ttlSeconds * 1000)
      : new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h default

    // Use a single SQL query with INSERT ... ON CONFLICT for atomic increment
    const result = await prisma.$queryRaw<{ value: number }[]>`
      INSERT INTO cache (key, value, expires_at)
      VALUES (${key}, '1', ${expiresAt})
      ON CONFLICT (key) DO UPDATE SET
        value = CASE 
          WHEN cache.expires_at > NOW() THEN (CAST(cache.value AS INTEGER) + 1)::TEXT
          ELSE '1'
        END,
        expires_at = CASE 
          WHEN cache.expires_at > NOW() THEN cache.expires_at
          ELSE ${expiresAt}
        END
      RETURNING CAST(value AS INTEGER) as value
    `;

    if (result.length > 0) {
      return result[0].value;
    }

    return 1;
  } catch (error) {
    console.error("[SupabaseCache] Error incrementing cache:", error);
    // Fallback: try to get and increment manually
    try {
      const current = await getCache(key);
      const newValue = (parseInt(current || "0", 10) + 1).toString();
      await setCache(key, newValue, ttlSeconds);
      return parseInt(newValue, 10);
    } catch {
      return 0;
    }
  }
}

/**
 * Get TTL of a key in seconds
 */
export async function getCacheTTL(key: string): Promise<number> {
  try {
    const result = await prisma.$queryRaw<{ expires_at: Date }[]>`
      SELECT expires_at
      FROM cache
      WHERE key = ${key} AND expires_at > NOW()
      LIMIT 1
    `;

    if (result.length === 0) {
      return -2; // Key doesn't exist
    }

    const expiresAt = new Date(result[0].expires_at);
    const now = new Date();
    const ttl = Math.ceil((expiresAt.getTime() - now.getTime()) / 1000);

    return ttl > 0 ? ttl : -1; // -1 if expired
  } catch (error) {
    console.error("[SupabaseCache] Error getting TTL:", error);
    return -1;
  }
}

// ============================================
// Sorted Set operations (for rate limiting)
// ============================================

/**
 * Add a member to a sorted set with a score
 */
export async function zaddCache(
  key: string,
  score: number,
  member: string,
  ttlSeconds?: number
): Promise<number> {
  try {
    const expiresAt = ttlSeconds
      ? new Date(Date.now() + ttlSeconds * 1000)
      : new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h default

    // Check if member already exists before inserting
    const existing = await prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int as count
      FROM cache_sorted_set
      WHERE key = ${key} AND member = ${member} AND expires_at > NOW()
    `;

    const existed = (existing[0]?.count || 0) > 0;

    // Insert or update
    await prisma.$executeRaw`
      INSERT INTO cache_sorted_set (key, member, score, expires_at)
      VALUES (${key}, ${member}, ${score}, ${expiresAt})
      ON CONFLICT (key, member) 
      DO UPDATE SET 
        score = EXCLUDED.score,
        expires_at = EXCLUDED.expires_at
    `;

    // Return 0 if existed, 1 if new (Redis zadd returns 0 if member already exists, 1 if new)
    return existed ? 0 : 1;
  } catch (error) {
    console.error("[SupabaseCache] Error zadd:", error);
    return 0;
  }
}

/**
 * Remove members from sorted set by score range
 */
export async function zremrangebyscoreCache(
  key: string,
  min: number,
  max: number
): Promise<number> {
  try {
    const result = await prisma.$executeRaw`
      DELETE FROM cache_sorted_set
      WHERE key = ${key} AND score >= ${min} AND score <= ${max}
    `;
    return result || 0;
  } catch (error) {
    console.error("[SupabaseCache] Error zremrangebyscore:", error);
    return 0;
  }
}

/**
 * Get count of members in sorted set
 */
export async function zcardCache(key: string): Promise<number> {
  try {
    const result = await prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*) as count
      FROM cache_sorted_set
      WHERE key = ${key} AND expires_at > NOW()
    `;
    return result[0]?.count || 0;
  } catch (error) {
    console.error("[SupabaseCache] Error zcard:", error);
    return 0;
  }
}

/**
 * Get range of members from sorted set
 */
export async function zrangeCache(
  key: string,
  start: number,
  stop: number
): Promise<string[]> {
  try {
    const result = await prisma.$queryRaw<{ member: string }[]>`
      SELECT member
      FROM cache_sorted_set
      WHERE key = ${key} AND expires_at > NOW()
      ORDER BY score ASC
      OFFSET ${start >= 0 ? start : 0}
      LIMIT ${stop >= 0 ? stop - start + 1 : 1000}
    `;
    return result.map((r) => r.member);
  } catch (error) {
    console.error("[SupabaseCache] Error zrange:", error);
    return [];
  }
}

/**
 * Set expiration on a key
 */
export async function expireCache(
  key: string,
  ttlSeconds: number
): Promise<number> {
  try {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    const result = await prisma.$executeRaw`
      UPDATE cache
      SET expires_at = ${expiresAt}
      WHERE key = ${key}
    `;
    return result > 0 ? 1 : 0;
  } catch (error) {
    console.error("[SupabaseCache] Error expire:", error);
    return 0;
  }
}

/**
 * Clean up expired entries (can be called periodically)
 */
export async function cleanupExpiredCache(): Promise<void> {
  try {
    await prisma.$executeRaw`SELECT cleanup_expired_cache()`;
  } catch (error) {
    console.error("[SupabaseCache] Error cleaning up expired cache:", error);
    // Fallback: manual cleanup
    try {
      await prisma.$executeRaw`DELETE FROM cache WHERE expires_at < NOW()`;
      await prisma.$executeRaw`DELETE FROM cache_sorted_set WHERE expires_at < NOW()`;
    } catch (e) {
      console.error("[SupabaseCache] Fallback cleanup failed:", e);
    }
  }
}

