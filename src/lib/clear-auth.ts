/**
 * Nettoie complètement toutes les données d'authentification locales
 */
export function clearAllAuthData() {
  // Nettoyer le localStorage
  if (typeof window !== "undefined") {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.includes("supabase") || key.includes("auth")) {
        localStorage.removeItem(key);
      }
    });

    // Nettoyer le sessionStorage
    const sessionKeys = Object.keys(sessionStorage);
    sessionKeys.forEach((key) => {
      if (key.includes("supabase") || key.includes("auth")) {
        sessionStorage.removeItem(key);
      }
    });

    // Nettoyer les cookies
    document.cookie.split(";").forEach((cookie) => {
      const eqPos = cookie.indexOf("=");
      const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
      if (name.includes("supabase") || name.includes("auth")) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
      }
    });

    console.log("All auth data cleared");
  }
}
