// Rate limiting pour l'authentification
const authAttempts = new Map<string, { count: number; lastAttempt: number }>();

export function checkRateLimit(
  identifier: string,
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000
): boolean {
  const now = Date.now();
  const attempts = authAttempts.get(identifier);

  if (!attempts) {
    authAttempts.set(identifier, { count: 1, lastAttempt: now });
    return true;
  }

  // Reset si la fenêtre est expirée
  if (now - attempts.lastAttempt > windowMs) {
    authAttempts.set(identifier, { count: 1, lastAttempt: now });
    return true;
  }

  // Vérifier si le nombre d'tentatives est dépassé
  if (attempts.count >= maxAttempts) {
    return false;
  }

  // Incrémenter le compteur
  attempts.count++;
  attempts.lastAttempt = now;
  authAttempts.set(identifier, attempts);
  return true;
}

export function getRateLimitMessage(identifier: string): string {
  const attempts = authAttempts.get(identifier);
  if (!attempts) return "";

  const remaining = Math.max(0, 5 - attempts.count);
  return `Too many attempts. Try again in ${Math.ceil(
    (15 * 60 * 1000 - (Date.now() - attempts.lastAttempt)) / 60000
  )} minutes.`;
}
