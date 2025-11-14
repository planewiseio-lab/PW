import { createClient } from "@/lib/supabase/client";

/**
 * Vérifie si l'utilisateur est valide et gère automatiquement la déconnexion
 * en cas d'erreur 403 (compte supprimé)
 */
export async function validateUser() {
  const supabase = createClient();

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    // Si erreur 403 ou utilisateur supprimé, déconnecter automatiquement
    if (
      error &&
      (error.message.includes("403") || error.message.includes("Forbidden"))
    ) {
      console.log("User account no longer exists, signing out...");
      await supabase.auth.signOut();
      return null;
    }

    return user;
  } catch (err) {
    console.error("Error validating user:", err);
    return null;
  }
}

/**
 * Gère la déconnexion automatique en cas d'erreur d'authentification
 */
export async function handleAuthError(error: any) {
  if (
    error &&
    (error.message.includes("403") || error.message.includes("Forbidden"))
  ) {
    console.log("User account no longer exists, signing out...");
    const supabase = createClient();
    await supabase.auth.signOut();
    return true; // Indique qu'une déconnexion a eu lieu
  }
  return false;
}
