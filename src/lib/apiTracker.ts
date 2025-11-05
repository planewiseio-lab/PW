import { supabaseAdmin } from "@/lib/supabase/admin";

// Mapping des endpoints vers les tiers AeroDataBox
function getTier(endpoint: string): string {
  // Tier 1: Single aircraft (by tail-number, Mode-S or ID)
  if (
    endpoint.includes("/aircraft/") &&
    !endpoint.includes("/flights") &&
    !endpoint.includes("/history")
  ) {
    return "Tier 1";
  }

  // Tier 2: Airports et recherche de vols
  if (
    endpoint.includes("/airports/") ||
    endpoint.includes("/flights/search") ||
    endpoint.includes("/flights/browse") ||
    endpoint.includes("/airports/browse") ||
    endpoint.includes("/flight/") // Single flight
  ) {
    return "Tier 2";
  }

  // Tier 3: Détails spécifiques et historique des vols
  if (
    endpoint.includes("/flights/number") ||
    endpoint.includes("/aircraft/registration") ||
    (endpoint.includes("/aircraft/") && endpoint.includes("/flights")) // Historique des vols d'un avion
  ) {
    return "Tier 3";
  }

  // Tier 2 par défaut
  return "Tier 2";
}

/**
 * Logger une requête API vers AeroDataBox dans Supabase
 * Ne tracke PAS les réponses 204 (No Content) car elles ne consomment pas d'appel API
 */
export async function logApiRequest(
  endpoint: string,
  method: string,
  statusCode: number,
  responseTime: number,
  userId?: string | null
) {
  // Ne pas tracker les réponses 204 (No Content) car elles ne consomment pas d'appel API
  if (statusCode === 204) {
    console.log(`[API Tracker] Skipping log for 204 response (no content): ${endpoint}`);
    return;
  }

  try {
    await supabaseAdmin.from("api_requests").insert({
      user_id: userId || null,
      endpoint,
      method,
      tier: getTier(endpoint),
      status_code: statusCode,
      response_time_ms: responseTime,
    });
  } catch (error) {
    console.error("[API Tracker] Failed to log request:", error);
  }
}
