import { NextRequest, NextResponse } from "next/server";

// Token d'accès pour les testeurs (à changer en production)
// Vous pouvez aussi utiliser une variable d'environnement
const TEST_ACCESS_TOKEN = process.env.TEST_ACCESS_TOKEN || "test-paddle-2024";

// Liste d'emails autorisés (optionnel)
const AUTHORIZED_EMAILS = process.env.AUTHORIZED_EMAILS
  ? process.env.AUTHORIZED_EMAILS.split(",").map((e) => e.trim())
  : [];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, email } = body;

    if (!token) {
      return NextResponse.json(
        { valid: false, error: "Token requis" },
        { status: 400 }
      );
    }

    // Vérifier le token
    if (token === TEST_ACCESS_TOKEN) {
      // Si une whitelist d'emails est configurée, vérifier l'email
      if (AUTHORIZED_EMAILS.length > 0 && email) {
        if (!AUTHORIZED_EMAILS.includes(email.toLowerCase())) {
          return NextResponse.json(
            {
              valid: false,
              error: "Email non autorisé. Contactez le support pour obtenir l'accès.",
            },
            { status: 403 }
          );
        }
      }

      return NextResponse.json({ valid: true });
    }

    return NextResponse.json(
      { valid: false, error: "Token invalide" },
      { status: 401 }
    );
  } catch (error) {
    console.error("[Test Access] Error:", error);
    return NextResponse.json(
      { valid: false, error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

