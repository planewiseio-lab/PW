import { User } from "@supabase/supabase-js";

/**
 * Vérifie de manière sécurisée si un utilisateur est admin
 * 
 * Utilise une double vérification :
 * 1. Vérifie les métadonnées Supabase (user_metadata ou app_metadata)
 * 2. Vérifie la whitelist d'emails admins dans les variables d'environnement
 * 
 * @param user - L'utilisateur Supabase à vérifier
 * @returns true si l'utilisateur est admin, false sinon
 */
export function verifyAdmin(user: User): boolean {
  // 1. Vérifier les métadonnées Supabase
  const hasAdminRole =
    user.user_metadata?.role === "admin" ||
    user.app_metadata?.role === "admin";

  if (!hasAdminRole) {
    return false;
  }

  // 2. Vérifier la whitelist d'emails admins (si configurée)
  const adminEmails = process.env.ADMIN_EMAILS;
  if (adminEmails) {
    const allowedEmails = adminEmails.split(",").map((email) => email.trim().toLowerCase());
    const userEmail = user.email?.toLowerCase();
    
    if (!userEmail || !allowedEmails.includes(userEmail)) {
      // L'utilisateur a le rôle admin dans les métadonnées mais n'est pas dans la whitelist
      console.warn(
        `[Security] User ${user.id} (${userEmail}) has admin role but is not in ADMIN_EMAILS whitelist`
      );
      return false;
    }
  }

  return true;
}

/**
 * Vérifie si un utilisateur peut modifier les crédits d'un autre utilisateur
 * 
 * Empêche l'auto-modification : même les admins ne peuvent pas modifier leurs propres crédits
 * via l'API admin (pour éviter les abus et maintenir l'intégrité des données)
 * 
 * @param adminUserId - L'ID de l'utilisateur admin qui fait la requête
 * @param targetUserId - L'ID de l'utilisateur dont on veut modifier les crédits
 * @returns true si la modification est autorisée, false sinon
 */
export function canModifyCredits(adminUserId: string, targetUserId: string): boolean {
  // Empêcher l'auto-modification
  if (adminUserId === targetUserId) {
    console.warn(
      `[Security] Admin ${adminUserId} attempted to modify their own credits - blocked`
    );
    return false;
  }

  return true;
}

/**
 * Log d'audit pour les modifications de crédits par un admin
 */
export function logAdminCreditAction(
  adminId: string,
  adminEmail: string | undefined,
  targetUserId: string,
  action: "grant" | "remove" | "adjust",
  amount: number,
  reason: string,
  metadata?: Record<string, any>
): void {
  console.log(
    `[AUDIT] Admin Credit Action: ${action} ${amount} credits\n` +
    `  Admin: ${adminId} (${adminEmail || "unknown"})\n` +
    `  Target User: ${targetUserId}\n` +
    `  Reason: ${reason}\n` +
    `  Metadata: ${JSON.stringify(metadata || {})}\n` +
    `  Timestamp: ${new Date().toISOString()}`
  );
}






