-- Create cache table for Redis replacement using Supabase PostgreSQL
-- This table will store key-value pairs with TTL (expiration)

CREATE TABLE IF NOT EXISTS "cache" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index for efficient cleanup of expired entries
CREATE INDEX IF NOT EXISTS "idx_cache_expires_at" ON "cache"("expires_at");

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS "idx_cache_key" ON "cache"("key");

-- Table for sorted sets (used for rate limiting sliding window)
CREATE TABLE IF NOT EXISTS "cache_sorted_set" (
    "key" TEXT NOT NULL,
    "member" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("key", "member")
);

-- Indexes for sorted sets
CREATE INDEX IF NOT EXISTS "idx_cache_sorted_set_key_score" ON "cache_sorted_set"("key", "score");
CREATE INDEX IF NOT EXISTS "idx_cache_sorted_set_expires_at" ON "cache_sorted_set"("expires_at");

-- Function to automatically clean expired entries (can be called periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM "cache" WHERE "expires_at" < NOW();
    DELETE FROM "cache_sorted_set" WHERE "expires_at" < NOW();
END;
$$ LANGUAGE plpgsql;

