import { refreshFreeCreditsDaily } from "./refreshFreeCredits";

/**
 * Configuration du planificateur pour les cron jobs
 * Compatible avec Vercel Cron et Supabase Scheduled Functions
 */

// Configuration du fuseau horaire America/Toronto
const TORONTO_TIMEZONE = "America/Toronto";

/**
 * Fonction principale du cron job pour les crédits FREE
 * À exécuter tous les jours à 00:00 heure de l'Est
 */
export async function dailyFreeCreditsCron() {
  console.log(
    `[SCHEDULER] 🕐 Executing daily FREE credits cron at ${new Date().toLocaleString(
      "en-CA",
      { timeZone: TORONTO_TIMEZONE }
    )} Toronto time`
  );

  try {
    const result = await refreshFreeCreditsDaily();

    console.log(
      `[SCHEDULER] ✅ Daily FREE credits cron completed successfully`
    );
    console.log(`[SCHEDULER] 📊 Result:`, result);

    return {
      success: true,
      timestamp: new Date().toISOString(),
      timezone: TORONTO_TIMEZONE,
      result,
    };
  } catch (error) {
    console.error(`[SCHEDULER] ❌ Daily FREE credits cron failed:`, error);

    return {
      success: false,
      timestamp: new Date().toISOString(),
      timezone: TORONTO_TIMEZONE,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Fonction pour vérifier si c'est le bon moment d'exécuter le cron
 * (utile pour les environnements qui ne supportent pas les cron natifs)
 */
export function shouldRunDailyCron(): boolean {
  const now = new Date();
  const torontoTime = new Date(
    now.toLocaleString("en-US", { timeZone: TORONTO_TIMEZONE })
  );

  // Vérifier si c'est entre 00:00 et 00:59 heure de Toronto
  const hour = torontoTime.getHours();
  const minute = torontoTime.getMinutes();

  return hour === 0 && minute < 60; // Exécuter dans la première heure
}

/**
 * Fonction de surveillance du cron job
 */
export async function monitorCronJobs() {
  console.log(`[MONITOR] 🔍 Monitoring cron jobs...`);

  const now = new Date();
  const torontoTime = new Date(
    now.toLocaleString("en-US", { timeZone: TORONTO_TIMEZONE })
  );

  console.log(`[MONITOR] 📅 Current time:`);
  console.log(`  - UTC: ${now.toISOString()}`);
  console.log(
    `  - Toronto: ${torontoTime.toLocaleString("en-CA", {
      timeZone: TORONTO_TIMEZONE,
    })}`
  );
  console.log(`  - Should run: ${shouldRunDailyCron()}`);

  return {
    utc: now.toISOString(),
    toronto: torontoTime.toLocaleString("en-CA", {
      timeZone: TORONTO_TIMEZONE,
    }),
    shouldRun: shouldRunDailyCron(),
  };
}
