// Wrapper pour Resend - utilise require() pour éviter les problèmes avec Turbopack
export function createResendClient(apiKey: string) {
  // Utiliser require() directement - fonctionne mieux côté serveur Next.js
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Resend } = require("resend");
  return new Resend(apiKey);
}

