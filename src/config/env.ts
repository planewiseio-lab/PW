// Configuration des variables d'environnement
export const env = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  },
  aerodatabox: {
    apiKey: process.env.AERODATABOX_API_KEY || process.env.RAPID_KEY!,
  },
  airreg: {
    apiKey: process.env.AIRREG_API_KEY || process.env.RAPID_KEY!,
  },
} as const;

// Validation des variables requises
if (!env.supabase.url || !env.supabase.anonKey) {
  throw new Error("Missing Supabase environment variables");
}
