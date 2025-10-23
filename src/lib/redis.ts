import { Redis } from "@upstash/redis";

// Configuration Redis
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

// Interface pour le fallback in-memory
interface MemoryEntry {
  value: any;
  expiresAt: number;
}

// Fallback in-memory avec TTL
class MemoryRedis {
  private store = new Map<string, MemoryEntry>();

  constructor() {
    // Nettoyer les entrées expirées toutes les minutes
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store.entries()) {
        if (entry.expiresAt <= now) {
          this.store.delete(key);
        }
      }
    }, 60000);
  }

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }

    return entry.value;
  }

  async set(
    key: string,
    value: string,
    options?: { ex?: number }
  ): Promise<string> {
    const expiresAt = options?.ex
      ? Date.now() + options.ex * 1000
      : Date.now() + 24 * 60 * 60 * 1000; // 24h par défaut
    this.store.set(key, { value, expiresAt });
    return "OK";
  }

  async incr(key: string): Promise<number> {
    const current = await this.get(key);
    const newValue = current ? parseInt(current) + 1 : 1;
    await this.set(key, newValue.toString());
    return newValue;
  }

  async ttl(key: string): Promise<number> {
    const entry = this.store.get(key);
    if (!entry) return -2;

    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return -2;
    }

    return Math.ceil((entry.expiresAt - Date.now()) / 1000);
  }
}

// Client Redis principal
let redisClient: Redis | MemoryRedis;

if (redisUrl && redisToken) {
  // Utiliser Upstash Redis en production
  try {
    redisClient = new Redis({
      url: redisUrl,
      token: redisToken,
    });
    console.log("✅ Redis client initialized with Upstash");
  } catch (error) {
    console.warn(
      "⚠️ Failed to initialize Upstash Redis, falling back to memory:",
      error
    );
    redisClient = new MemoryRedis();
  }
} else {
  // Fallback in-memory en développement
  console.log("🔧 Using in-memory Redis fallback (development mode)");
  redisClient = new MemoryRedis();
}

export { redisClient };

// Fonctions utilitaires
export async function getRedisValue(key: string): Promise<string | null> {
  try {
    return await redisClient.get(key);
  } catch (error) {
    console.error("Redis get error:", error);
    return null;
  }
}

export async function setRedisValue(
  key: string,
  value: string,
  ttlSeconds?: number
): Promise<boolean> {
  try {
    const options = ttlSeconds ? { ex: ttlSeconds } : undefined;
    await redisClient.set(key, value, options);
    return true;
  } catch (error) {
    console.error("Redis set error:", error);
    return false;
  }
}

export async function incrementRedisValue(
  key: string,
  ttlSeconds?: number
): Promise<number> {
  try {
    const result = await redisClient.incr(key);
    if (ttlSeconds && result === 1) {
      // Premier incrément, définir le TTL
      await redisClient.set(key, "1", { ex: ttlSeconds });
    }
    return result;
  } catch (error) {
    console.error("Redis incr error:", error);
    return 0;
  }
}

export async function getRedisTTL(key: string): Promise<number> {
  try {
    return await redisClient.ttl(key);
  } catch (error) {
    console.error("Redis TTL error:", error);
    return -1;
  }
}
