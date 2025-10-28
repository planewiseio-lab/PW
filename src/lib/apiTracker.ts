import { supabaseAdmin } from "@/lib/supabase/admin";

// Mapping des endpoints vers les tiers AeroDataBox
function getTier(endpoint: string): string {
  // Tier 1: Informations de base
  if (endpoint.includes("/airports/") && !endpoint.includes("/flights")) {
    return "Tier 1";
  }

  // Tier 2: Recherche et navigation
  if (
    endpoint.includes("/flights/search") ||
    endpoint.includes("/flights/browse") ||
    endpoint.includes("/airports/browse")
  ) {
    return "Tier 2";
  }

  // Tier 3: Détails spécifiques
  if (
    endpoint.includes("/flights/number") ||
    endpoint.includes("/aircraft/registration")
  ) {
    return "Tier 3";
  }

  // Tier 4: Historique et données complexes
  if (
    endpoint.includes("/history") ||
    endpoint.includes("/predictions") ||
    endpoint.includes("/route")
  ) {
    return "Tier 4";
  }

  // Tier 2 par défaut (détails d'avion, recherche de vol, etc.)
  return "Tier 2";
}

/**
 * Logger une requête API vers AeroDataBox dans Supabase
 */
export async function logApiRequest(
  endpoint: string,
  method: string,
  statusCode: number,
  responseTime: number,
  userId?: string | null
) {
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
