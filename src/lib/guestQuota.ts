import { NextRequest } from "next/server";
import {
  getRedisValue,
  setRedisValue,
  incrementRedisValue,
  getRedisTTL,
} from "./redis";

// Configuration du quota invité
export const GUEST_QUOTA_LIMIT = 4;
export const GUEST_QUOTA_TTL = 86400; // 24h en secondes

// Interface pour l'usage invité
export interface GuestUsage {
  count: number;
  remaining: number;
  ttl: number;
}

/**
 * Extrait l'IP client depuis les headers de la requête
 */
export function getClientIp(req: NextRequest): string {
  // 1. Vérifier x-forwarded-for (premier élément)
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const ips = forwardedFor.split(",").map((ip) => ip.trim());
    const firstIp = ips[0];
    if (firstIp && firstIp !== "unknown") {
      return normalizeIp(firstIp);
    }
  }

  // 2. Vérifier x-real-ip
  const realIp = req.headers.get("x-real-ip");
  if (realIp && realIp !== "unknown") {
    return normalizeIp(realIp);
  }

  // 3. Fallback pour le développement
  if (process.env.NODE_ENV === "development") {
    return "127.0.0.1";
  }

  // 4. Dernier recours
  return "127.0.0.1";
}

/**
 * Normalise l'adresse IP (IPv4/IPv6)
 */
function normalizeIp(ip: string): string {
  // Supprimer les espaces et caractères indésirables
  const cleanIp = ip.trim().toLowerCase();

  // Si c'est une IPv6, on peut la garder telle quelle
  if (cleanIp.includes(":")) {
    return cleanIp;
  }

  // Si c'est une IPv4, s'assurer qu'elle est valide
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(cleanIp)) {
    return cleanIp;
  }

  // Fallback
  return "127.0.0.1";
}

/**
 * Génère la clé Redis pour un invité
 */
function getGuestKey(ip: string): string {
  return `guest:ip:${ip}`;
}

/**
 * Récupère l'usage actuel d'un invité
 */
export async function getGuestUsage(ip: string): Promise<GuestUsage> {
  const key = getGuestKey(ip);

  try {
    const countStr = await getRedisValue(key);
    const count = countStr ? parseInt(countStr, 10) : 0;
    const ttl = await getRedisTTL(key);

    return {
      count,
      remaining: Math.max(0, GUEST_QUOTA_LIMIT - count),
      ttl: ttl > 0 ? ttl : 0,
    };
  } catch (error) {
    console.error("Error getting guest usage:", error);
    return {
      count: 0,
      remaining: GUEST_QUOTA_LIMIT,
      ttl: 0,
    };
  }
}

/**
 * Incrémente l'usage d'un invité
 */
export async function incrementGuestUsage(ip: string): Promise<GuestUsage> {
  const key = getGuestKey(ip);

  try {
    // Incrémenter le compteur
    const count = await incrementRedisValue(key, GUEST_QUOTA_TTL);

    // Récupérer le TTL actuel
    const ttl = await getRedisTTL(key);

    return {
      count,
      remaining: Math.max(0, GUEST_QUOTA_LIMIT - count),
      ttl: ttl > 0 ? ttl : 0,
    };
  } catch (error) {
    console.error("Error incrementing guest usage:", error);
    return {
      count: 1,
      remaining: GUEST_QUOTA_LIMIT - 1,
      ttl: GUEST_QUOTA_TTL,
    };
  }
}

/**
 * Vérifie si un invité a dépassé son quota
 */
export async function isGuestQuotaExceeded(ip: string): Promise<boolean> {
  console.log(`[Guest Quota] 🔍 Checking quota for IP: ${ip}`);
  const usage = await getGuestUsage(ip);
  console.log(
    `[Guest Quota] 📊 Current usage: ${usage.count}/${GUEST_QUOTA_LIMIT}, remaining: ${usage.remaining}`
  );
  const exceeded = usage.count >= GUEST_QUOTA_LIMIT;
  console.log(`[Guest Quota] 🚫 Quota exceeded: ${exceeded}`);
  return exceeded;
}

/**
 * Réinitialise le quota d'un invité (pour les tests)
 */
export async function resetGuestQuota(ip: string): Promise<void> {
  const key = getGuestKey(ip);
  try {
    await setRedisValue(key, "0", 1); // TTL très court pour forcer l'expiration
  } catch (error) {
    console.error("Error resetting guest quota:", error);
  }
}

/**
 * Obtient les statistiques du quota invité
 */
export async function getGuestQuotaStats(ip: string): Promise<{
  limit: number;
  used: number;
  remaining: number;
  ttl: number;
  isExceeded: boolean;
}> {
  const usage = await getGuestUsage(ip);

  return {
    limit: GUEST_QUOTA_LIMIT,
    used: usage.count,
    remaining: usage.remaining,
    ttl: usage.ttl,
    isExceeded: usage.count >= GUEST_QUOTA_LIMIT,
  };
}
