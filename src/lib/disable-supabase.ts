/**
 * Désactive complètement Supabase en cas d'erreur 403
 */
export function disableSupabase() {
  if (typeof window !== "undefined") {
    // Marquer l'utilisateur comme supprimé
    localStorage.setItem("user-deleted", "true");

    // Nettoyer toutes les données Supabase
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.includes("supabase") || key.includes("sb-")) {
        localStorage.removeItem(key);
      }
    });

    // Nettoyer le sessionStorage
    const sessionKeys = Object.keys(sessionStorage);
    sessionKeys.forEach((key) => {
      if (key.includes("supabase") || key.includes("sb-")) {
        sessionStorage.removeItem(key);
      }
    });

    // Nettoyer les cookies Supabase
    document.cookie.split(";").forEach((cookie) => {
      const eqPos = cookie.indexOf("=");
      const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
      if (name.includes("supabase") || name.includes("sb-")) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
      }
    });

    console.log("Supabase completely disabled due to 403 error");
  }
}
