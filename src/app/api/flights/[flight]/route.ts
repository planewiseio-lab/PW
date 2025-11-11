import { NextRequest, NextResponse } from "next/server";
import {
  correctFlightStatus,
  logStatusCorrection,
} from "@/lib/flightStatusRules";
import { withFlightBrowseAccess } from "@/lib/withActionAccess";
import { getCache as getSupabaseCache, setCache as setSupabaseCache } from "@/lib/supabaseCache";

const AERODATABOX_API_KEY =
  process.env.API_MARKET_KEY || process.env.AERODATABOX_API_KEY;
const AERODATABOX_BASE_URL = process.env.API_MARKET_BASE_URL || "https://prod.api.market/api/v1/aedbx/aerodatabox";

// Cache Supabase persistant (partagé entre toutes les instances serverless)
// Utilise PostgreSQL au lieu d'un Map en mémoire pour fonctionner en serverless
const pendingRequests = new Map<string, Promise<any>>();

// Fonction de cache Supabase (asynchrone)
async function getCache(key: string): Promise<string | null> {
  const cached = await getSupabaseCache(key);
  if (cached) {
    console.log(`[FlightAPI] Cache HIT from Supabase for ${key}`);
    return cached;
  }
  return null;
}

async function setCache(key: string, data: string, ttlSeconds: number): Promise<void> {
  await setSupabaseCache(key, data, ttlSeconds);
  console.log(`[FlightAPI] Cache SET in Supabase for ${key} (TTL: ${ttlSeconds}s)`);
}

// Fonction de calcul de distance Haversine
function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Fonction pour obtenir l'offset UTC d'un timezone
function getTimezoneOffset(timezone: string): number {
  // Mapping des timezones courants vers leurs offsets UTC (en heures)
  const timezoneOffsets: { [key: string]: number } = {
    // Amérique du Nord
    "America/New_York": -5, // EST/EDT
    "America/Chicago": -6, // CST/CDT
    "America/Denver": -7, // MST/MDT
    "America/Los_Angeles": -8, // PST/PDT
    "America/Toronto": -5, // EST/EDT
    "America/Vancouver": -8, // PST/PDT
    "America/Edmonton": -7, // MST/MDT (Calgary)
    "America/Montreal": -5, // EST/EDT

    // Europe
    "Europe/London": 0, // GMT/BST
    "Europe/Paris": 1, // CET/CEST
    "Europe/Frankfurt": 1, // CET/CEST
    "Europe/Rome": 1, // CET/CEST
    "Europe/Madrid": 1, // CET/CEST

    // Asie
    "Asia/Tokyo": 9, // JST
    "Asia/Shanghai": 8, // CST
    "Asia/Hong_Kong": 8, // HKT
    "Asia/Singapore": 8, // SGT

    // Australie
    "Australia/Sydney": 10, // AEST/AEDT
    "Australia/Melbourne": 10, // AEST/AEDT

    // UTC
    UTC: 0,
  };

  return timezoneOffsets[timezone] || 0; // Default to UTC si timezone inconnu
}

// Fonction pour appeler AeroDataBox avec timeout et déduplication
async function callAero(
  path: string
): Promise<{ ok: boolean; status: number; text: string; url: string }> {
  // api.market REST API - selon documentation: https://docs.api.market
  // Base URL: https://prod.api.market/api/v1
  // Authentication: x-magicapi-key header
  
  // Structure 1: URL REST api.market officielle (prod.api.market/api/v1/{workspace}/{product})
  const url1 = `https://prod.api.market/api/v1/aedbx/aerodatabox${path}`;
  
  // Structure 2: URL api.market sans prod (fallback)
  const url2 = `https://api.market/api/v1/aedbx/aerodatabox${path}`;
  
  // Structure 3: URL api.market alternative (sans /v1)
  const url3 = `https://api.market/api/aedbx/aerodatabox${path}`;
  
  // Structure 4: URL api.market directe (structure simplifiée)
  const url4 = `https://api.market/aedbx/aerodatabox${path}`;
  
  const urlsToTry = [url1, url2, url3, url4];
  
  // Utiliser la première URL comme clé de déduplication
  const dedupKey = url1;
  if (pendingRequests.has(dedupKey)) {
    return pendingRequests.get(dedupKey);
  }

  const requestPromise = (async () => {
    const startTime = Date.now();
    
    // Essayer chaque URL jusqu'à trouver une qui fonctionne
    for (const url of urlsToTry) {
      try {
        // Timeout de 15 secondes
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(url, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "x-magicapi-key": AERODATABOX_API_KEY!, // api.market REST API header (selon documentation)
            "x-api-market-key": AERODATABOX_API_KEY!, // Compatibilité MCP
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const text = await response.text();

        // Logger la requête API (seulement pour la première tentative)
        // Ne pas tracker les réponses 204 (No Content) car elles ne consomment pas d'appel API
        if (url === url1 && response.status !== 204) {
          const responseTime = Date.now() - startTime;
          const { logApiRequest } = await import("@/lib/apiTracker");

          // Récupérer l'utilisateur pour le logging
          const { createClient } = await import("@/lib/supabase/server");
          const supabase = await createClient();
          const {
            data: { user },
          } = await supabase.auth.getUser();

          await logApiRequest(
            path,
            "GET",
            response.status,
            responseTime,
            user?.id || null
          );
        }

        // Si succès, retourner immédiatement
        if (response.ok) {
          return {
            ok: response.ok,
            status: response.status,
            text,
            url,
          };
        }

        // Si erreur 401/403, essayer la prochaine URL
        if (response.status === 401 || response.status === 403) {
          console.log(`[callAero flights] Auth error (${response.status}) with ${url}, trying next...`);
          continue;
        }

        // Pour les autres erreurs (429, 500, etc.), retourner quand même
        return {
          ok: response.ok,
          status: response.status,
          text,
          url,
        };
      } catch (error: any) {
        // Si erreur réseau ou timeout, essayer la prochaine URL
        if (error.name === "AbortError") {
          console.log(`[callAero flights] Timeout with ${url}, trying next...`);
          if (url === urlsToTry[urlsToTry.length - 1]) {
            // Dernière URL, retourner l'erreur timeout
            return {
              ok: false,
              status: 408,
              text: JSON.stringify({ error: "Request timeout" }),
              url,
            };
          }
          continue;
        }
        console.log(`[callAero flights] Network error with ${url}: ${error.message}, trying next...`);
        if (url === urlsToTry[urlsToTry.length - 1]) {
          // Dernière URL, retourner l'erreur
          return {
            ok: false,
            status: 500,
            text: JSON.stringify({ error: "Network error" }),
            url,
          };
        }
        continue;
      }
    }
    
    // Si toutes les URLs ont échoué
    return {
      ok: false,
      status: 502,
      text: JSON.stringify({ error: "All API endpoints failed" }),
      url: urlsToTry[0],
    };
  })();

  pendingRequests.set(dedupKey, requestPromise);

  // Nettoyer après completion
  requestPromise.finally(() => {
    pendingRequests.delete(dedupKey);
  });

  return requestPromise;
}

export const GET = withFlightBrowseAccess(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ flight: string }> }
  ) => {
    console.log(`[FlightAPI] ====== GET /api/flights/[flight] called ======`);
    console.log(`[FlightAPI] Request URL:`, request.url);
    
    try {
      if (!AERODATABOX_API_KEY) {
        console.log(`[FlightAPI] ERROR: AeroDataBox API key not configured`);
        return NextResponse.json(
          { error: "AeroDataBox API key not configured" },
          { status: 500 }
        );
      }

      const { flight } = await params;
      console.log(`[FlightAPI] Extracted flight param from params:`, flight);
      const { searchParams: urlSearchParams } = new URL(request.url);
      const dateLocal =
        urlSearchParams.get("dateLocal") || urlSearchParams.get("date");

      // Décoder explicitement le paramètre flight (au cas où Next.js ne le ferait pas)
      // et gérer les cas où il pourrait être undefined ou null
      let flightParam = flight;
      if (typeof flightParam === "string") {
        // Décoder les caractères encodés dans l'URL (%20 pour espace, etc.)
        try {
          flightParam = decodeURIComponent(flightParam);
        } catch (e) {
          // Si le décodage échoue, utiliser la valeur originale
          console.log(`[FlightAPI] Failed to decode flight parameter, using original:`, flightParam);
        }
      }

      // Debug: voir ce qui est reçu
      console.log(`[FlightAPI] Received flight parameter:`, {
        raw: flight,
        decoded: flightParam,
        type: typeof flightParam,
        length: flightParam?.length,
        encoded: encodeURIComponent(flightParam || ""),
        url: request.url,
      });

      // Validation stricte du numéro de vol (supprimer les espaces pour normalisation)
      const numberRaw = String(flightParam || "").trim().toUpperCase().replace(/\s+/g, "");
      
      console.log(`[FlightAPI] Normalized flight number:`, {
        original: flight,
        normalized: numberRaw,
      });
      
      // Validation plus permissive : accepter les formats avec ou sans espace
      if (!numberRaw || numberRaw.length < 2) {
        return NextResponse.json(
          { error: "Invalid flight number format. Use format like AC123 or AC 123" },
          { status: 400 }
        );
      }
      
      // Vérifier que le numéro contient au moins une lettre et un chiffre
      const hasLetter = /[A-Z]/.test(numberRaw);
      const hasDigit = /\d/.test(numberRaw);
      
      if (!hasLetter || !hasDigit) {
        console.log(`[FlightAPI] Flight number validation failed:`, {
          numberRaw,
          hasLetter,
          hasDigit,
        });
        return NextResponse.json(
          { error: "Invalid flight number format. Must contain letters and numbers. Use format like AC123 or AC 123" },
          { status: 400 }
        );
      }

      // Validation de la date si fournie
      if (dateLocal && !/^\d{4}-\d{2}-\d{2}$/.test(dateLocal)) {
        return NextResponse.json(
          { error: "Invalid date format. Use YYYY-MM-DD" },
          { status: 400 }
        );
      }

      // Clé de cache normalisée (toujours utiliser numberRaw sans espace pour cohérence)
      // Cela garantit que "LH466", "LH 466", "lh466" utilisent tous la même clé de cache
      const now = new Date();
      const requestedDate = dateLocal ? new Date(dateLocal) : now;
      const isHistoricalDate = dateLocal && requestedDate < now;
      const isOlderThan24h = isHistoricalDate && (now.getTime() - requestedDate.getTime()) > 24 * 60 * 60 * 1000;
      const cacheKey = `flight:${numberRaw}:${dateLocal || "today"}`;
      
      console.log(`[FlightAPI] Cache key: ${cacheKey} (normalized from: "${flight}")`);

      // Vérifier si on doit forcer un refresh (paramètre ?refresh=true)
      const forceRefresh = urlSearchParams.get("refresh") === "true";
      
      // Vérifier le cache Supabase persistant (partagé entre toutes les instances serverless)
      const cached = forceRefresh ? null : await getCache(cacheKey);
      if (cached && !forceRefresh) {
        try {
          let cachedPayload = JSON.parse(cached);
          
          // Si le cache contient un tableau brut (format API externe), l'ignorer et refaire la normalisation
          if (Array.isArray(cachedPayload)) {
            console.log(`[FlightAPI] Cache contains raw array format, ignoring and calling API to normalize`);
            cachedPayload = null; // Forcer un nouvel appel API
          }
          
          // Si cachedPayload est null après vérification, continuer avec l'appel API
          if (!cachedPayload) {
            // Continue to API call below
          } else if (cachedPayload && cachedPayload.__pending === true) {
            console.log(`[FlightAPI] Request already in progress for ${cacheKey}, waiting...`);
            // Attendre que la requête en cours se termine (max 5 secondes)
            for (let i = 0; i < 50; i++) {
              await new Promise(resolve => setTimeout(resolve, 100));
              const retryCache = await getCache(cacheKey);
              if (retryCache) {
                const retryPayload = JSON.parse(retryCache);
                // Si c'est toujours en pending après 5s, continuer quand même
                if (retryPayload.__pending !== true || i >= 49) {
                  if (retryPayload.__pending !== true) {
                    // Le résultat est maintenant disponible, l'utiliser
                    const hasFlightsArray = Array.isArray(retryPayload.flights);
                    const isEmptyFlightsArray = hasFlightsArray && retryPayload.flights.length === 0;
                    const hasValidFlightData = retryPayload && (
                      retryPayload.airline || 
                      retryPayload.departure || 
                      retryPayload.arrival ||
                      (hasFlightsArray && retryPayload.flights.length > 0)
                    );
                    
                    if (hasValidFlightData && !isEmptyFlightsArray) {
                      console.log(`[FlightAPI] Cache HIT (after waiting) for ${cacheKey}`);
                      const response = NextResponse.json(retryPayload);
                      response.headers.set("X-Cache", "HIT");
                      const cachedRequestedDate = dateLocal ? new Date(dateLocal) : new Date();
                      const cachedIsOlderThan24h = dateLocal && (now.getTime() - cachedRequestedDate.getTime()) > 24 * 60 * 60 * 1000;
                      const cachedTtlSeconds = cachedIsOlderThan24h ? 7 * 24 * 60 * 60 : 30 * 60;
                      response.headers.set("Cache-Control", `public, max-age=${cachedTtlSeconds}, s-maxage=${cachedTtlSeconds}`);
                      return response;
                    }
                  }
                  break;
                }
              }
            }
            // Si on arrive ici, on continue avec l'appel API (timeout ou résultat invalide)
          } else if (cachedPayload) {
            // Ne pas utiliser le cache si c'est une réponse vide (flights: [] ou tableau vide)
            // Vérifier si c'est un payload valide avec des données de vol (airline, departure, etc.)
            const hasFlightsArray = Array.isArray(cachedPayload.flights);
            const isEmptyFlightsArray = hasFlightsArray && cachedPayload.flights.length === 0;
            const hasValidFlightData = cachedPayload && (
              cachedPayload.airline || 
              cachedPayload.departure || 
              cachedPayload.arrival ||
              (hasFlightsArray && cachedPayload.flights.length > 0)
            );
            
            // Utiliser le cache seulement si c'est un payload valide (pas une réponse vide)
            if (hasValidFlightData && !isEmptyFlightsArray) {
              console.log(`[FlightAPI] Cache HIT for ${cacheKey}`, {
                hasNumber: !!cachedPayload.number,
                hasAirline: !!cachedPayload.airline,
                hasDeparture: !!cachedPayload.departure,
                hasArrival: !!cachedPayload.arrival,
                flightsCount: cachedPayload.flights?.length || 0,
                flightNumber: cachedPayload.number || cachedPayload.flights?.[0]?.number,
              });
              const response = NextResponse.json(cachedPayload);
              response.headers.set("X-Cache", "HIT");
              // Déterminer le TTL du cache HIT en fonction de l'âge du vol
              const cachedRequestedDate = dateLocal ? new Date(dateLocal) : new Date();
              const cachedIsOlderThan24h = dateLocal && (now.getTime() - cachedRequestedDate.getTime()) > 24 * 60 * 60 * 1000;
              const cachedTtlSeconds = cachedIsOlderThan24h ? 7 * 24 * 60 * 60 : 30 * 60;
              response.headers.set("Cache-Control", `public, max-age=${cachedTtlSeconds}, s-maxage=${cachedTtlSeconds}`);
              return response;
            } else {
              console.log(`[FlightAPI] Cache contains invalid/empty data for ${cacheKey}, ignoring cache and calling API`, {
                hasFlightsArray,
                isEmptyFlightsArray,
                hasValidFlightData,
                cachedPayloadKeys: cachedPayload ? Object.keys(cachedPayload) : [],
              });
            }
          }
        } catch (e) {
          console.log(`[FlightAPI] Failed to parse cached response, ignoring cache:`, e);
        }
      }

      // Si pas de cache, mettre un placeholder de déduplication pour éviter les appels dupliqués
      const lockKey = `${cacheKey}:__lock`;
      const existingLock = await getCache(lockKey);
      if (!existingLock) {
        // Mettre un placeholder de déduplication (TTL court : 5 secondes)
        await setCache(lockKey, JSON.stringify({ __pending: true }), 5);
        console.log(`[FlightAPI] Set deduplication lock for ${cacheKey}`);
      } else {
        console.log(`[FlightAPI] Another request is already processing ${cacheKey}, will wait and retry cache`);
        // Attendre un peu et réessayer le cache
        await new Promise(resolve => setTimeout(resolve, 200));
        const retryCache = await getCache(cacheKey);
        if (retryCache) {
          const retryPayload = JSON.parse(retryCache);
          if (retryPayload.__pending !== true) {
            const hasFlightsArray = Array.isArray(retryPayload.flights);
            const isEmptyFlightsArray = hasFlightsArray && retryPayload.flights.length === 0;
            const hasValidFlightData = retryPayload && (
              retryPayload.airline || 
              retryPayload.departure || 
              retryPayload.arrival ||
              (hasFlightsArray && retryPayload.flights.length > 0)
            );
            
            if (hasValidFlightData && !isEmptyFlightsArray) {
              console.log(`[FlightAPI] Cache HIT (after lock wait) for ${cacheKey}`);
              const response = NextResponse.json(retryPayload);
              response.headers.set("X-Cache", "HIT");
              const cachedRequestedDate = dateLocal ? new Date(dateLocal) : new Date();
              const cachedIsOlderThan24h = dateLocal && (now.getTime() - cachedRequestedDate.getTime()) > 24 * 60 * 60 * 1000;
              const cachedTtlSeconds = cachedIsOlderThan24h ? 7 * 24 * 60 * 60 : 30 * 60;
              response.headers.set("Cache-Control", `public, max-age=${cachedTtlSeconds}, s-maxage=${cachedTtlSeconds}`);
              return response;
            }
          }
        }
      }

      console.log(`[FlightAPI] Cache MISS for ${cacheKey} - calling API`);

      // SOLUTION OPTIMALE: Essayer plusieurs formats car l'API peut accepter différents formats
      // L'API AeroDataBox peut accepter "LH466" ou "LH 466" (avec espace)
      let candidates: string[] = [];
      
      // Générer les variations possibles du numéro de vol
      const variations: string[] = [];
      
      // Format 1: Sans espace (LH466)
      variations.push(numberRaw);
      
      // Format 2: Avec espace si le numéro a au moins 2 caractères (LH 466)
      if (numberRaw.length >= 2) {
        const airlineCode = numberRaw.match(/^([A-Z0-9]{1,3})/)?.[1] || "";
        const flightNum = numberRaw.substring(airlineCode.length);
        if (airlineCode && flightNum) {
          variations.push(`${airlineCode} ${flightNum}`);
        }
      }
      
      console.log(`[FlightAPI] Generated variations for ${numberRaw}:`, variations);

      if (dateLocal) {
        // Essayer toutes les variations avec la date exacte
        for (const variation of variations) {
          candidates.push(
            `/flights/number/${encodeURIComponent(
              variation
            )}/${encodeURIComponent(
              dateLocal
            )}?withLocation=true&withCodeshared=true&withCancelled=true&limit=25`
          );
        }
        
        // Aussi essayer le jour suivant (utile pour les vols qui partent tard le soir)
        const requestedDateObj = new Date(dateLocal);
        const nextDay = new Date(requestedDateObj);
        nextDay.setDate(nextDay.getDate() + 1);
        const nextDayStr = nextDay.toISOString().split('T')[0];
        
        console.log(`[FlightAPI] Also trying next day: ${nextDayStr} (requested: ${dateLocal})`);
        
        for (const variation of variations) {
          candidates.push(
            `/flights/number/${encodeURIComponent(
              variation
            )}/${encodeURIComponent(
              nextDayStr
            )}?withLocation=true&withCodeshared=true&withCancelled=true&limit=25`
          );
        }
        
        // Si aucune variation ne fonctionne avec la date, essayer sans date
        // (pour récupérer le vol le plus récent disponible)
        for (const variation of variations) {
          candidates.push(
            `/flights/number/${encodeURIComponent(
              variation
            )}?withLocation=true&withCodeshared=true&withCancelled=true&limit=25`
          );
        }
      } else {
        // Essayer toutes les variations sans date
        for (const variation of variations) {
          candidates.push(
            `/flights/number/${encodeURIComponent(
              variation
            )}?withLocation=true&withCodeshared=true&withCancelled=true&limit=25`
          );
        }
      }

      // Collecter TOUS les résultats de tous les candidats pour filtrer ensuite
      const allFlights: any[] = [];
      let foundExactDateMatch = false; // Flag pour savoir si on a trouvé un vol avec la date exacte

      console.log(`[FlightAPI] Trying ${candidates.length} API candidates:`, candidates.map(c => c.split('?')[0]));
      
      // Séparer les candidats par type : date exacte, jour suivant, sans date
      const exactDateCandidates: string[] = [];
      const nextDayCandidates: string[] = [];
      const noDateCandidates: string[] = [];
      
      if (dateLocal) {
        const requestedDateObj = new Date(dateLocal);
        const nextDay = new Date(requestedDateObj);
        nextDay.setDate(nextDay.getDate() + 1);
        const nextDayStr = nextDay.toISOString().split('T')[0];
        
        for (const candidate of candidates) {
          if (candidate.includes(`/${dateLocal}`)) {
            exactDateCandidates.push(candidate);
          } else if (candidate.includes(`/${nextDayStr}`)) {
            nextDayCandidates.push(candidate);
          } else if (!candidate.includes('/202') && !candidate.includes('/20')) {
            noDateCandidates.push(candidate);
          }
        }
        
        console.log(`[FlightAPI] Categorized candidates:`, {
          exactDate: exactDateCandidates.length,
          nextDay: nextDayCandidates.length,
          noDate: noDateCandidates.length,
        });
      } else {
        noDateCandidates.push(...candidates);
      }
      
      // Fonction pour traiter un candidat
      const processCandidate = async (pathPart: string): Promise<boolean> => {
        console.log(`[FlightAPI] Trying API call: ${pathPart}`);
        const resp = await callAero(pathPart);
        console.log(`[AeroDataBox] Response: ${resp.status} from ${resp.url}`);

        // Si 204 (pas de contenu), continuer sans erreur et sans parser
        if (resp.status === 204) {
          console.log(`[FlightAPI] No content (204) for ${pathPart}, continuing`);
          return false; // Pas de résultats
        }

        // Si 5xx, arrêter et retourner une erreur
        if (resp.status >= 500) {
          console.log(`[FlightAPI] Server error ${resp.status} for ${pathPart}`);
          // Ne pas lancer d'exception, mais retourner false pour continuer avec d'autres candidats
          return false;
        }

        if (resp.ok) {
          try {
            // Vérifier que resp.text n'est pas vide avant de parser
            if (!resp.text || resp.text.trim().length === 0) {
              console.log(`[FlightAPI] Empty response body for ${pathPart}`);
              return false;
            }
            const data = JSON.parse(resp.text);
            const flights = Array.isArray(data)
              ? data
              : Array.isArray(data?.data)
              ? data.data
              : [];
            console.log(
              `[FlightAPI] Found ${flights.length} flights from ${pathPart}`
            );
            
            if (flights.length > 0) {
              // Si on a une date, vérifier si c'est un match exact
              if (dateLocal) {
                const exactMatch = flights.find((flight: any) => {
                  const depLocalTime =
                    flight.departure?.scheduledTime?.local ||
                    flight.departure?.revisedTime?.local ||
                    flight.dep?.scheduledTime?.local ||
                    flight.dep?.revisedTime?.local;
                  if (!depLocalTime) return false;
                  const depLocalDate = depLocalTime.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
                  return depLocalDate === dateLocal;
                });
                
                if (exactMatch) {
                  foundExactDateMatch = true;
                  console.log(`[FlightAPI] ✅ Found exact date match from ${pathPart}`);
                }
              }
              
              allFlights.push(...flights);
              return true; // Résultats trouvés
            }
            return false; // Pas de résultats
          } catch (e) {
            console.log(
              `[FlightAPI] Failed to parse response from ${pathPart}: ${e}`
            );
            return false;
          }
        }
        return false;
      };
      
      // Traiter d'abord les candidats avec la date exacte
      if (dateLocal && exactDateCandidates.length > 0) {
        console.log(`[FlightAPI] Processing ${exactDateCandidates.length} exact date candidates...`);
        for (const candidate of exactDateCandidates) {
          await processCandidate(candidate);
          // Si on a trouvé un match exact, on peut arrêter de chercher la date exacte
          // mais on continue quand même pour collecter tous les résultats possibles
        }
      }
      
      // Si on n'a pas trouvé de match exact ET qu'on a une date, essayer le jour suivant
      if (dateLocal && !foundExactDateMatch && nextDayCandidates.length > 0) {
        console.log(`[FlightAPI] No exact match found, trying ${nextDayCandidates.length} next day candidates...`);
        for (const candidate of nextDayCandidates) {
          await processCandidate(candidate);
        }
      }
      
      // Si on n'a toujours pas de résultats et qu'on a une date, essayer sans date
      if (dateLocal && allFlights.length === 0 && noDateCandidates.length > 0) {
        console.log(`[FlightAPI] Still no results, trying ${noDateCandidates.length} no-date candidates...`);
        for (const candidate of noDateCandidates) {
          const hasResults = await processCandidate(candidate);
          // Si on trouve des résultats sans date, arrêter
          if (hasResults && allFlights.length > 0) {
            break;
          }
        }
      } else if (!dateLocal && noDateCandidates.length > 0) {
        // Si pas de date spécifiée, essayer tous les candidats sans date
        for (const candidate of noDateCandidates) {
          const hasResults = await processCandidate(candidate);
          if (hasResults && allFlights.length > 0) {
            break;
          }
        }
      }

      if (allFlights.length === 0) {
        // Retourner un payload vide 200 plutôt qu'un 404 pour éviter erreurs UI
        console.log(`[FlightAPI] No flights found for ${numberRaw} on ${dateLocal || "today"}`);
        return NextResponse.json({ number: numberRaw, flights: [] });
      }

      // Utiliser les vols collectés
      const flights = allFlights;

      // Si on a une date demandée, filtrer les vols pour trouver ceux qui correspondent
      // à la date demandée OU au jour suivant (pour les vols qui partent tard le soir)
      let filteredFlights = flights;
      if (dateLocal) {
        const requestedDateObj = new Date(dateLocal);
        const nextDay = new Date(requestedDateObj);
        nextDay.setDate(nextDay.getDate() + 1);
        const nextDayStr = nextDay.toISOString().split('T')[0];
        
        filteredFlights = flights.filter((flight: any) => {
          const depLocalTime =
            flight.departure?.scheduledTime?.local ||
            flight.departure?.revisedTime?.local ||
            flight.dep?.scheduledTime?.local ||
            flight.dep?.revisedTime?.local;
          if (!depLocalTime) return true; // Garder les vols sans date pour ne pas les perdre
          const depLocalDate = depLocalTime.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
          // Accepter la date demandée OU le jour suivant
          return depLocalDate === dateLocal || depLocalDate === nextDayStr;
        });
        
        console.log(`[FlightAPI] Filtered ${flights.length} flights to ${filteredFlights.length} for date ${dateLocal} or ${nextDayStr}`);
        
        // Si on a trouvé des vols filtrés, les utiliser
        if (filteredFlights.length > 0) {
          filteredFlights = filteredFlights;
        } else {
          // Si aucun vol ne correspond à la date demandée ou au jour suivant, utiliser tous les vols
          console.log(`[FlightAPI] No flights match requested date or next day, using all ${flights.length} flights`);
          filteredFlights = flights;
        }
      }

      // Trouver le bon avion en filtrant par date et en évitant les vols codeshare incorrects
      let f = filteredFlights[0];

      // Log détaillé pour débugger
      console.log(
        `[FlightAPI] Processing ${filteredFlights.length} flights for ${numberRaw} on ${
          dateLocal || "today"
        }`
      );
      filteredFlights.forEach((flight: any, idx: number) => {
        // Essayer différentes structures possibles pour l'immatriculation
        const reg =
          flight.aircraft?.registration ||
          flight.aircraft?.reg ||
          flight.aircraft?.aircraft?.registration ||
          flight.aircraft?.aircraft?.reg ||
          flight.aircraft?.aircraftRegistration ||
          "Unknown";
        const codeshare =
          flight.codeshare?.airlineIata ||
          flight.codeshare?.airline?.iata ||
          flight.codeshare?.airlineIataCode ||
          "None";
        console.log(
          `[FlightAPI] Flight ${idx}: reg=${reg}, codeshare=${codeshare}, airline=${
            flight.airline?.name || "Unknown"
          }`
        );
        console.log(
          `[FlightAPI] Flight ${idx} aircraft structure:`,
          JSON.stringify(flight.aircraft, null, 2)
        );
      });

      // Si on a une date spécifique, filtrer par date locale de départ
      // Note: filteredFlights contient déjà les vols de la date demandée ou du jour suivant
      if (dateLocal) {
        // Préférer le vol de la date exacte, sinon prendre celui du jour suivant
        const exactDateFlight = filteredFlights.find((flight: any) => {
          const depLocalTime =
            flight.departure?.scheduledTime?.local ||
            flight.departure?.revisedTime?.local ||
            flight.dep?.scheduledTime?.local ||
            flight.dep?.revisedTime?.local;

          if (!depLocalTime) return false;
          const depLocalDate = depLocalTime.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
          if (!depLocalDate) return false;

          console.log(
            `[FlightAPI] Comparing: requested=${dateLocal}, flight=${depLocalDate}`
          );

          return depLocalDate === dateLocal;
        });
        
        const matchingFlight = exactDateFlight || filteredFlights[0];

        if (matchingFlight) {
          f = matchingFlight;
          console.log(
            `[FlightAPI] ✅ Found flight matching date ${dateLocal}: reg=${f.aircraft?.reg}`
          );
        } else {
          // Si aucun vol ne correspond à la date exacte, utiliser le premier vol disponible
          // (c'est souvent le cas pour les dates futures où l'API retourne le vol le plus récent)
          console.log(
            `[FlightAPI] ⚠️ No flight matches date ${dateLocal}, using first result`
          );
          filteredFlights.forEach((flight: any, idx: number) => {
            const depLocalTime =
              flight.departure?.scheduledTime?.local ||
              flight.departure?.revisedTime?.local ||
              flight.dep?.scheduledTime?.local ||
              flight.dep?.revisedTime?.local;
            const depLocalDate = depLocalTime?.match(/^\d{4}-\d{2}-\d{2}/)?.[0] || depLocalTime?.split("T")[0] || "Unknown";
            const reg = flight.aircraft?.reg || flight.aircraft?.registration || "Unknown";
            console.log(
              `[FlightAPI] Flight ${idx}: date=${depLocalDate}, reg=${reg}`
            );
          });
          // Utiliser le premier vol même si la date ne correspond pas exactement
          // (utile pour les dates futures ou les vols récurrents)
          f = flights[0];
          console.log(
            `[FlightAPI] Using first available flight: reg=${f.aircraft?.reg || f.aircraft?.registration}`
          );
        }
      }

      // Log de la structure complète du vol sélectionné pour débugger
      console.log(
        `[FlightAPI] Selected flight complete structure:`,
        JSON.stringify(f, null, 2)
      );

      // Récupérer les aéroports et coordonnées
      const depAp = f?.departure?.airport || f?.dep?.airport || {};
      const arrAp = f?.arrival?.airport || f?.arr?.airport || {};
      const dlat = depAp.location?.lat ?? depAp.latitude;
      const dlon = depAp.location?.lon ?? depAp.longitude;
      const alat = arrAp.location?.lat ?? arrAp.latitude;
      const alon = arrAp.location?.lon ?? arrAp.longitude;

      // Calculer la distance si les coordonnées sont disponibles
      const distanceKm = [dlat, dlon, alat, alon].every(
        (v) => typeof v === "number"
      )
        ? Math.round(haversineKm(dlat, dlon, alat, alon))
        : Math.round(f?.greatCircleDistance?.km || 0);

      // Logique métier : Corriger les statuts obsolètes
      let correctedStatus = f?.status || "Unknown";
      // Utiliser les règles centralisées pour corriger le statut
      // Utiliser revisedTime ou predictedTime comme estimatedTime pour la correction
      const estimatedArrivalTime = 
        f?.arrival?.predictedTime?.local ||
        f?.arrival?.revisedTime?.local ||
        f?.arrival?.estimatedTime?.local;
      
      const flightData = {
        status: correctedStatus,
        departure: {
          scheduledTime: f?.departure?.scheduledTime?.local,
          actualTime: f?.departure?.revisedTime?.local || f?.departure?.actualTime?.local,
        },
        arrival: {
          scheduledTime: f?.arrival?.scheduledTime?.local,
          estimatedTime: estimatedArrivalTime,
          actualTime: f?.arrival?.revisedTime?.local || f?.arrival?.actualTime?.local,
        },
      };

      const correctedFlight = correctFlightStatus(flightData);
      if (correctedFlight.status !== correctedStatus) {
        const now = new Date();
        const departureTime =
          f?.departure?.actualTime?.local || f?.departure?.scheduledTime?.local;
        const hoursDiff = departureTime
          ? (now.getTime() - new Date(departureTime).getTime()) /
            (1000 * 60 * 60)
          : 0;

        logStatusCorrection(correctedStatus, numberRaw, hoursDiff);
        correctedStatus = correctedFlight.status;
      }

      // Note: Les règles de statut sont maintenant gérées par la fonction centralisée correctFlightStatus

      // Normalisation des données (structure stable)
      const payload = {
        number: f?.number || numberRaw,
        airline: {
          name: f?.airline?.name || f?.airline?.icao || "Unknown Airline",
          iata: f?.airline?.iata || "",
          icao: f?.airline?.icao || "",
        },
        aircraft: {
          model: f?.aircraft?.model || f?.model || "Unknown Aircraft",
          registration: f?.aircraft?.reg || "Not available",
        },
        departure: {
          airport: {
            iata: depAp.iata || depAp.icao || depAp.code || "",
            name: depAp.name || depAp.municipalityName || depAp.city || "",
            city: depAp.city || depAp.municipalityName || "",
            latitude: dlat || null,
            longitude: dlon || null,
          },
          terminal: f?.departure?.terminal || null,
          gate: f?.departure?.gate || null,
          scheduledTimeLocal: f?.departure?.scheduledTime?.local || "",
          actualTimeLocal:
            f?.departure?.revisedTime?.local ||
            f?.departure?.actualTime?.local ||
            "",
          estimatedTimeLocal: f?.departure?.estimatedTime?.local || "",
          runwayTime: f?.departure?.runwayTime?.local || null,
        },
        arrival: {
          airport: {
            iata: arrAp.iata || arrAp.icao || arrAp.code || "",
            name: arrAp.name || arrAp.municipalityName || arrAp.city || "",
            city: arrAp.city || arrAp.municipalityName || "",
            latitude: alat || null,
            longitude: alon || null,
          },
          terminal: f?.arrival?.terminal || null,
          gate: f?.arrival?.gate || null,
          scheduledTimeLocal: f?.arrival?.scheduledTime?.local || "",
          actualTimeLocal:
            f?.arrival?.revisedTime?.local ||
            f?.arrival?.actualTime?.local ||
            "",
          estimatedTimeLocal:
            f?.arrival?.predictedTime?.local ||
            f?.arrival?.estimatedTime?.local ||
            "",
          runwayTime: f?.arrival?.runwayTime?.local || null,
        },
        status: correctedStatus,
        distance: distanceKm || null,
        codeshares: f?.codeshares || [],
        lastUpdated: f?.lastUpdatedUtc || new Date().toISOString(),
      };

      const textOut = JSON.stringify(payload);
      
      // Vérifier que le payload est bien un objet normalisé (pas un tableau)
      if (Array.isArray(payload)) {
        console.error(`[FlightAPI] ERROR: Payload is an array instead of normalized object! This should not happen.`);
        // Ne pas mettre en cache un tableau
        const response = NextResponse.json(payload);
        response.headers.set("X-Cache", "MISS");
        return response;
      }

      // Ne pas mettre en cache les réponses vides (pas de données de vol valides)
      const hasValidData = payload && (
        payload.airline || 
        payload.departure || 
        payload.arrival
      );

      // Cache optimisé avec TTL adaptatif (en secondes pour Supabase cache)
      // Vol plus vieux de 24h → 7 jours, sinon → 30min
      const ttlSeconds = isOlderThan24h 
        ? 7 * 24 * 60 * 60  // 7 jours pour les vols plus vieux de 24h
        : 30 * 60;           // 30min pour les vols futurs ou récents (< 24h)
      
      // Ne mettre en cache que si on a des données valides
      if (hasValidData) {
        console.log(`[FlightAPI] Caching normalized payload for ${cacheKey}`, {
          hasNumber: !!payload.number,
          hasAirline: !!payload.airline,
          hasDeparture: !!payload.departure,
          hasArrival: !!payload.arrival,
          payloadType: typeof payload,
          isArray: Array.isArray(payload),
        });
        await setCache(cacheKey, textOut, ttlSeconds);
        console.log(`[FlightAPI] Cached flight data for ${cacheKey} (TTL: ${ttlSeconds}s)`);
        
        // Retirer le verrou de déduplication maintenant que le résultat est en cache
        const lockKey = `${cacheKey}:__lock`;
        try {
          // Supprimer le verrou en mettant une valeur expirée (TTL 0)
          await setSupabaseCache(lockKey, "", 0);
          console.log(`[FlightAPI] Removed deduplication lock for ${cacheKey}`);
        } catch (e) {
          // Ignorer les erreurs de suppression du verrou (non critique)
          console.log(`[FlightAPI] Failed to remove lock (non-critical):`, e);
        }
      } else {
        console.log(`[FlightAPI] Not caching empty response for ${cacheKey}`);
        
        // Retirer quand même le verrou même si on ne cache pas
        const lockKey = `${cacheKey}:__lock`;
        try {
          await setSupabaseCache(lockKey, "", 0);
        } catch (e) {
          // Ignorer
        }
      }

      const response = NextResponse.json(payload);
      response.headers.set(
        "Cache-Control",
        `public, max-age=${ttlSeconds}, s-maxage=${ttlSeconds}` // TTL adaptatif: 7 jours pour vols > 24h, 30min pour vols futurs/récents
      );
      response.headers.set("X-Cache", "MISS");

      return response;
    } catch (error) {
      console.error("Flight API error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }
);
