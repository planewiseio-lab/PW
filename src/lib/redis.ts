import { Redis } from "@upstash/redis";

// Configuration Redis
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

// Interface pour le fallback in-memory
interface MemoryEntry {
  value: any;
  expiresAt: number;
}

// Store global partagé pour MemoryRedis (persiste entre les requêtes)
const globalForMemoryRedis = globalThis as unknown as {
  memoryRedisStore: Map<string, MemoryEntry> | undefined;
  memoryRedisCleanup: NodeJS.Timeout | undefined;
};

// Initialiser le store global une seule fois
if (!globalForMemoryRedis.memoryRedisStore) {
  globalForMemoryRedis.memoryRedisStore = new Map<string, MemoryEntry>();
  
  // Nettoyer les entrées expirées toutes les minutes
  globalForMemoryRedis.memoryRedisCleanup = setInterval(() => {
    if (!globalForMemoryRedis.memoryRedisStore) return;
    const now = Date.now();
    for (const [key, entry] of globalForMemoryRedis.memoryRedisStore.entries()) {
      if (entry.expiresAt <= now) {
        globalForMemoryRedis.memoryRedisStore.delete(key);
      }
    }
  }, 60000);
  
  console.log("[MemoryRedis] 🏪 Initialized global store for MemoryRedis");
}

// Fallback in-memory avec TTL
class MemoryRedis {
  private store: Map<string, MemoryEntry>;

  constructor() {
    // Utiliser le store global partagé
    if (!globalForMemoryRedis.memoryRedisStore) {
      globalForMemoryRedis.memoryRedisStore = new Map<string, MemoryEntry>();
    }
    this.store = globalForMemoryRedis.memoryRedisStore;
    console.log(`[MemoryRedis] 📦 Using global store (size: ${this.store.size})`);
  }

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) {
      console.log(`[MemoryRedis] 🔍 Key ${key} not found in store (size: ${this.store.size})`);
      return null;
    }

    const now = Date.now();
    if (entry.expiresAt <= now) {
      console.log(`[MemoryRedis] ⏰ Key ${key} expired (expired at ${new Date(entry.expiresAt).toISOString()}, now ${new Date(now).toISOString()})`);
      this.store.delete(key);
      return null;
    }

    console.log(`[MemoryRedis] ✅ Key ${key} found: ${entry.value}, expires at ${new Date(entry.expiresAt).toISOString()}`);
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

  async incr(key: string, options?: { ex?: number }): Promise<number> {
    // Incrément atomique dans la Map (tout en une seule opération synchronisée)
    const now = Date.now();
    const entry = this.store.get(key);
    
    // Vérifier si l'entrée existe et n'est pas expirée
    let currentValue = 0;
    let expiresAt: number;
    
    if (entry && entry.expiresAt > now) {
      currentValue = parseInt(entry.value, 10) || 0;
      expiresAt = entry.expiresAt; // Conserver le TTL existant
      console.log(`[MemoryRedis] 🔍 Key ${key} exists: ${currentValue}, expires at ${new Date(expiresAt).toISOString()}`);
    } else {
      // Première incrémentation ou entrée expirée, utiliser le TTL spécifié ou 24h par défaut
      expiresAt = options?.ex 
        ? now + options.ex * 1000 
        : now + 24 * 60 * 60 * 1000; // 24h par défaut
      console.log(`[MemoryRedis] 🆕 Key ${key} is new or expired, creating with TTL ${options?.ex || 86400}s`);
    }
    
    // Incrémenter et mettre à jour en une seule opération atomique
    const newValue = currentValue + 1;
    this.store.set(key, { value: newValue.toString(), expiresAt });
    console.log(`[MemoryRedis] ➕ Incremented ${key}: ${currentValue} -> ${newValue}, store size: ${this.store.size}`);
    
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
    // Pour MemoryRedis, passer le TTL directement à incr
    if (redisClient instanceof MemoryRedis && ttlSeconds) {
      return await (redisClient as any).incr(key, { ex: ttlSeconds });
    }
    
    // Pour Redis réel (Upstash), utiliser la méthode normale
    const result = await redisClient.incr(key);
    
    // Si un TTL est spécifié, définir le TTL (seulement si la clé n'a pas déjà de TTL)
    if (ttlSeconds) {
      const ttl = await redisClient.ttl(key);
      if (ttl < 0) {
        // La clé n'a pas de TTL, définir le TTL maintenant
        await redisClient.set(key, result.toString(), { ex: ttlSeconds });
      }
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
