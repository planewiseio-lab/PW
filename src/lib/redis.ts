// Migrated to use getRedisLike() from redisClient.ts for consistency
// This allows using Supabase cache instead of separate Redis instances
import { getRedisLike } from "./redisClient";

// Wrapper to maintain backward compatibility with existing API
// Uses the unified Redis-like interface (Supabase cache or Redis)
const redisLike = getRedisLike();

// Helper pour détecter le type de cache utilisé
function getCacheType(): string {
  const useSupabaseCache = process.env.USE_SUPABASE_CACHE === "true" || !process.env.REDIS_URL;
  return useSupabaseCache ? "Supabase cache" : "Redis";
}

// Fonctions utilitaires - utilise getRedisLike() pour compatibilité avec Supabase cache
export async function getRedisValue(key: string): Promise<string | null> {
  try {
    return await redisLike.get(key);
  } catch (error) {
    console.error(`[${getCacheType()}] Get error:`, error);
    return null;
  }
}

export async function setRedisValue(
  key: string,
  value: string,
  ttlSeconds?: number
): Promise<boolean> {
  try {
    const result = await redisLike.set(key, value, undefined, ttlSeconds);
    return result === "OK";
  } catch (error) {
    console.error(`[${getCacheType()}] Set error:`, error);
    return false;
  }
}

export async function incrementRedisValue(
  key: string,
  ttlSeconds?: number
): Promise<number> {
  try {
    // Essayer d'utiliser incrementCache atomique de Supabase si disponible
    try {
      const { incrementCache } = await import("./supabaseCache");
      const result = await incrementCache(key, ttlSeconds || 86400);
      return result;
    } catch {
      // Fallback: utiliser getRedisLike() (peut être Redis externe ou in-memory)
      const current = await redisLike.get(key);
      const currentValue = current ? parseInt(current, 10) || 0 : 0;
      const newValue = currentValue + 1;
      await redisLike.set(key, newValue.toString(), undefined, ttlSeconds);
      return newValue;
    }
  } catch (error) {
    console.error(`[${getCacheType()}] Increment error:`, error);
    return 0;
  }
}

export async function getRedisTTL(key: string): Promise<number> {
  try {
    // Utiliser getCacheTTL de supabaseCache si disponible
    // Sinon, on ne peut pas obtenir le TTL avec l'interface RedisLike
    try {
      const { getCacheTTL } = await import("./supabaseCache");
      return await getCacheTTL(key);
    } catch {
      // Si Supabase cache n'est pas disponible, retourner -1
      return -1;
    }
  } catch (error) {
    console.error(`[${getCacheType()}] TTL error:`, error);
    return -1;
  }
}
