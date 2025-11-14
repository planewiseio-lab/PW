import { NextRequest } from "next/server";
import {
  getRedisValue,
  setRedisValue,
  incrementRedisValue,
  getRedisTTL,
} from "./redis";

// Configuration du quota invité
export const GUEST_QUOTA_LIMIT = 3; // Pour toutes les autres actions (sans compter les lookups d'avions)
export const GUEST_AIRCRAFT_LOOKUP_LIMIT = 5; // Pour les lookups d'avions uniquement
export const GUEST_QUOTA_TTL = 86400; // 24h en secondes

// Interface pour l'usage invité
export interface GuestUsage {
  count: number;
  remaining: number;
  ttl: number;
}

/**
 * Extrait l'IP client depuis les headers de la requête
 * En développement, normalise toutes les variantes de localhost vers 127.0.0.1
 * 
 * SÉCURITÉ : En production, Vercel/Cloudflare ajoutent automatiquement les headers sécurisés.
 * Les headers x-forwarded-for et x-real-ip sont fiables uniquement s'ils proviennent du proxy.
 * Un client malveillant peut falsifier ces headers, mais en production derrière Vercel,
 * ces headers sont automatiquement sécurisés et ne peuvent pas être falsifiés par le client.
 */
export function getClientIp(req: NextRequest): string {
  // En production sur Vercel, l'IP réelle est dans x-forwarded-for ou x-real-ip
  // Ces headers sont sécurisés par Vercel et ne peuvent pas être falsifiés par le client
  
  // 1. Vérifier x-forwarded-for (premier élément - IP réelle du client)
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const ips = forwardedFor.split(",").map((ip) => ip.trim());
    const firstIp = ips[0];
    if (firstIp && firstIp !== "unknown") {
      const normalized = normalizeIp(firstIp);
      // En développement, forcer 127.0.0.1 pour localhost
      if (process.env.NODE_ENV === "development" && (normalized === "::1" || normalized.includes("::"))) {
        return "127.0.0.1";
      }
      // Valider que l'IP est valide avant de la retourner
      if (isValidIp(normalized)) {
        return normalized;
      }
    }
  }

  // 2. Vérifier x-real-ip (IP réelle du client, souvent utilisé par les proxies)
  const realIp = req.headers.get("x-real-ip");
  if (realIp && realIp !== "unknown") {
    const normalized = normalizeIp(realIp);
    // En développement, forcer 127.0.0.1 pour localhost
    if (process.env.NODE_ENV === "development" && (normalized === "::1" || normalized.includes("::"))) {
      return "127.0.0.1";
    }
    // Valider que l'IP est valide avant de la retourner
    if (isValidIp(normalized)) {
      return normalized;
    }
  }

  // 3. Essayer de détecter l'IP depuis la connexion (pour localhost IPv6)
  // En développement, forcer 127.0.0.1
  if (process.env.NODE_ENV === "development") {
    return "127.0.0.1";
  }

  // 4. Dernier recours (ne devrait jamais arriver en production)
  console.warn("[Guest Quota] ⚠️ Could not determine client IP, using fallback");
  return "127.0.0.1";
}

/**
 * Valide qu'une adresse IP est valide (IPv4 ou IPv6)
 */
function isValidIp(ip: string): boolean {
  if (!ip || ip.length === 0) return false;
  
  // IPv4 validation (plus stricte)
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(ip)) {
    const parts = ip.split(".");
    return parts.every(part => {
      const num = parseInt(part, 10);
      return num >= 0 && num <= 255;
    });
  }
  
  // IPv6 validation (format simplifié)
  if (ip.includes(":")) {
    // Format IPv6 basique (peut être amélioré)
    const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
    return ipv6Regex.test(ip) || ip === "::1";
  }
  
  return false;
}

/**
 * Normalise l'adresse IP (IPv4/IPv6)
 * En développement, normalise toutes les variantes de localhost vers 127.0.0.1
 */
function normalizeIp(ip: string): string {
  // Supprimer les espaces et caractères indésirables
  const cleanIp = ip.trim().toLowerCase();

  // En développement, normaliser toutes les variantes de localhost vers 127.0.0.1
  if (process.env.NODE_ENV === "development") {
    // Variantes de localhost IPv6
    if (cleanIp === "::1" || cleanIp === "::ffff:127.0.0.1" || cleanIp === "0:0:0:0:0:0:0:1") {
      return "127.0.0.1";
    }
    // Variantes de localhost IPv4
    if (cleanIp === "localhost" || cleanIp === "127.0.0.1" || cleanIp === "0.0.0.0") {
      return "127.0.0.1";
    }
  }

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
 * Génère la clé de cache (Supabase ou Redis) pour un invité
 */
function getGuestKey(ip: string, isAircraftLookup: boolean = false): string {
  if (isAircraftLookup) {
    return `guest:ip:${ip}:aircraft`;
  }
  return `guest:ip:${ip}`;
}

/**
 * Récupère l'usage actuel d'un invité
 */
export async function getGuestUsage(ip: string, isAircraftLookup: boolean = false): Promise<GuestUsage> {
  const key = getGuestKey(ip, isAircraftLookup);
  const limit = isAircraftLookup ? GUEST_AIRCRAFT_LOOKUP_LIMIT : GUEST_QUOTA_LIMIT;

  try {
    const countStr = await getRedisValue(key);
    const count = countStr ? parseInt(countStr, 10) : 0;
    let ttl = await getRedisTTL(key);
    
    // Détecter si on utilise Supabase cache ou Redis
    const useSupabaseCache = process.env.USE_SUPABASE_CACHE === "true" || !process.env.REDIS_URL;
    const cacheType = useSupabaseCache ? "Supabase cache" : "Redis";
    
    console.log(`[Guest Quota] 🔍 getGuestUsage for key: ${key}, TTL from ${cacheType}: ${ttl}, count: ${count}`);
    
    // getRedisTTL retourne:
    // - nombre positif = TTL en secondes
    // - -1 = erreur ou clé sans TTL
    // - -2 = clé n'existe pas
    // On transforme les valeurs négatives en 0, mais gardons les valeurs positives
    if (ttl < 0) {
      console.log(`[Guest Quota] ⚠️ TTL is negative (${ttl}), setting to 0`);
      ttl = 0;
    }

    return {
      count,
      remaining: Math.max(0, limit - count),
      ttl: ttl >= 0 ? ttl : 0, // Garder ttl si >= 0, sinon 0
    };
  } catch (error) {
    console.error("Error getting guest usage:", error);
    return {
      count: 0,
      remaining: limit,
      ttl: 0,
    };
  }
}

/**
 * Incrémente l'usage d'un invité
 */
export async function incrementGuestUsage(ip: string, isAircraftLookup: boolean = false): Promise<GuestUsage> {
  const key = getGuestKey(ip, isAircraftLookup);
  const limit = isAircraftLookup ? GUEST_AIRCRAFT_LOOKUP_LIMIT : GUEST_QUOTA_LIMIT;

  try {
    // Incrémenter le compteur
    const count = await incrementRedisValue(key, GUEST_QUOTA_TTL);

    // Récupérer le TTL actuel
    const ttl = await getRedisTTL(key);

    return {
      count,
      remaining: Math.max(0, limit - count),
      ttl: ttl > 0 ? ttl : 0,
    };
  } catch (error) {
    console.error("Error incrementing guest usage:", error);
    return {
      count: 1,
      remaining: limit - 1,
      ttl: GUEST_QUOTA_TTL,
    };
  }
}

/**
 * Vérifie si un invité a dépassé son quota
 */
export async function isGuestQuotaExceeded(ip: string, isAircraftLookup: boolean = false): Promise<boolean> {
  console.log(`[Guest Quota] 🔍 Checking quota for IP: ${ip}, isAircraftLookup: ${isAircraftLookup}`);
  const usage = await getGuestUsage(ip, isAircraftLookup);
  const limit = isAircraftLookup ? GUEST_AIRCRAFT_LOOKUP_LIMIT : GUEST_QUOTA_LIMIT;
  console.log(
    `[Guest Quota] 📊 Current usage: ${usage.count}/${limit}, remaining: ${usage.remaining}`
  );
  const exceeded = usage.count >= limit;
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
export async function getGuestQuotaStats(ip: string, isAircraftLookup: boolean = false): Promise<{
  limit: number;
  used: number;
  remaining: number;
  ttl: number;
  isExceeded: boolean;
}> {
  const usage = await getGuestUsage(ip, isAircraftLookup);
  const limit = isAircraftLookup ? GUEST_AIRCRAFT_LOOKUP_LIMIT : GUEST_QUOTA_LIMIT;

  return {
    limit,
    used: usage.count,
    remaining: usage.remaining,
    ttl: usage.ttl,
    isExceeded: usage.count >= limit,
  };
}
